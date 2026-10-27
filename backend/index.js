require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173'] : true
}));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'autoforce_garage',
  waitForConnections: true,
  connectionLimit: 10
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, message: 'API conectada y MySQL disponible' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'API activa, pero no se pudo conectar a MySQL', detail: error.message });
  }
});

app.get('/api/productos', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY destacado DESC, id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No se pudieron cargar los productos', detail: e.message }); }
});

app.post('/api/productos', async (req, res) => {
  const { nombre, categoria, descripcion = '', precio, stock = 0, imagen = '', destacado = 0 } = req.body;
  if (!nombre || !categoria || !Number.isFinite(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'Nombre, categoría y precio válido son obligatorios.' });
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO productos (nombre,categoria,descripcion,precio,stock,imagen,destacado) VALUES (?,?,?,?,?,?,?)',
      [nombre, categoria, descripcion, Number(precio), Number(stock) || 0, imagen, destacado ? 1 : 0]
    );
    const [rows] = await pool.query('SELECT * FROM productos WHERE id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'No se pudo crear el producto', detail: e.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
  const { nombre, categoria, descripcion = '', precio, stock = 0, imagen = '', destacado = 0 } = req.body;
  if (!nombre || !categoria || !Number.isFinite(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'Nombre, categoría y precio válido son obligatorios.' });
  }
  try {
    const [r] = await pool.query(
      'UPDATE productos SET nombre=?,categoria=?,descripcion=?,precio=?,stock=?,imagen=?,destacado=? WHERE id=?',
      [nombre, categoria, descripcion, Number(precio), Number(stock) || 0, imagen, destacado ? 1 : 0, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    const [rows] = await pool.query('SELECT * FROM productos WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'No se pudo actualizar el producto', detail: e.message }); }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM productos WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (e) { res.status(500).json({ error: 'No se pudo eliminar. Puede estar incluido en un pedido.', detail: e.message }); }
});

app.get('/api/servicios', async (_req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM servicios ORDER BY id'); res.json(rows); }
  catch (e) { res.status(500).json({ error: 'No se pudieron cargar servicios', detail: e.message }); }
});

app.get('/api/pedidos', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.fecha, p.estado, p.total, c.nombre AS cliente, c.telefono, c.correo
      FROM pedidos p JOIN clientes c ON c.id=p.cliente_id ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No se pudieron cargar pedidos', detail: e.message }); }
});

app.post('/api/pedidos', async (req, res) => {
  const { cliente, telefono = '', correo = '', items } = req.body;
  if (!cliente || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Escribe tu nombre y agrega al menos un producto al carrito.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let total = 0;
    const validated = [];
    for (const item of items) {
      const quantity = Math.max(1, parseInt(item.cantidad, 10) || 1);
      const [rows] = await connection.query('SELECT id,nombre,precio,stock FROM productos WHERE id=? FOR UPDATE', [item.producto_id]);
      if (!rows.length) throw new Error(`Producto ${item.producto_id} no existe.`);
      if (rows[0].stock < quantity) throw new Error(`Stock insuficiente para ${rows[0].nombre}. Disponible: ${rows[0].stock}.`);
      const price = Number(rows[0].precio);
      total += price * quantity;
      validated.push({ ...rows[0], quantity, price });
    }
    const [customer] = await connection.query('INSERT INTO clientes (nombre,telefono,correo) VALUES (?,?,?)', [cliente, telefono, correo]);
    const [order] = await connection.query('INSERT INTO pedidos (cliente_id,total) VALUES (?,?)', [customer.insertId, total]);
    for (const item of validated) {
      await connection.query(
        'INSERT INTO detalle_pedido (pedido_id,producto_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)',
        [order.insertId, item.id, item.quantity, item.price, item.quantity * item.price]
      );
      await connection.query('UPDATE productos SET stock=stock-? WHERE id=?', [item.quantity, item.id]);
    }
    await connection.commit();
    res.status(201).json({ message: 'Pedido registrado correctamente', pedido_id: order.insertId, total: Number(total.toFixed(2)) });
  } catch (e) {
    await connection.rollback();
    res.status(400).json({ error: e.message || 'No se pudo registrar el pedido' });
  } finally { connection.release(); }
});

app.get('/api/pedidos/:id/detalle', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dp.id, p.nombre AS producto, dp.cantidad, dp.precio_unitario, dp.subtotal
      FROM detalle_pedido dp JOIN productos p ON p.id=dp.producto_id WHERE dp.pedido_id=?
    `, [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'No se pudo cargar el detalle', detail: e.message }); }
});

app.listen(PORT, () => console.log(`AutoForce API lista en http://localhost:${PORT}`));
