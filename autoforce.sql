CREATE DATABASE IF NOT EXISTS autoforce_garage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autoforce_garage;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  imagen VARCHAR(500),
  destacado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio_desde DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion VARCHAR(60)
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(30),
  correo VARCHAR(150),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('Pendiente','En proceso','Completado','Cancelado') DEFAULT 'Pendiente',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

INSERT INTO productos (nombre,categoria,descripcion,precio,stock,imagen,destacado) VALUES
('Aceite sintético 5W-30','Lubricantes','Protección para motores modernos.',24.99,30,'https://images.unsplash.com/photo-1635784063384-6f7f9f2e8c43?auto=format&fit=crop&w=900&q=80',1),
('Pastillas de freno premium','Frenos','Frenado confiable y respuesta precisa.',38.50,18,'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80',1),
('Batería automotriz 12V','Electricidad','Energía confiable para tu vehículo.',89.00,12,'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80',1),
('Filtro de aire deportivo','Filtros','Flujo de aire optimizado.',19.95,25,'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80',0),
('Kit de herramientas mecánicas','Herramientas','Kit práctico para mantenimiento.',54.90,10,'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=80',0),
('Lámparas LED H7','Iluminación','Iluminación blanca para carretera.',32.00,22,'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',0);

INSERT INTO servicios (nombre,descripcion,precio_desde,duracion) VALUES
('Diagnóstico computarizado','Revisión electrónica y lectura de códigos.',25.00,'45–60 min'),
('Cambio de aceite','Cambio de aceite y revisión de niveles.',20.00,'30 min'),
('Sistema de frenos','Inspección de discos, pastillas y líquido.',35.00,'60–90 min'),
('Mantenimiento preventivo','Revisión general de puntos esenciales.',45.00,'90 min');
