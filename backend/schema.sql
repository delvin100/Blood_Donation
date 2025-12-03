CREATE DATABASE IF NOT EXISTS ebloodbank;
USE ebloodbank;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('donor','hospital','admin') DEFAULT 'donor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  blood_group VARCHAR(5) NOT NULL, 
  last_donation DATE,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  eligible TINYINT(1) DEFAULT 1,
  health_info TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE hospitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  contact VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE blood_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  units INT NOT NULL,
  description TEXT,
  location_lat DECIMAL(9,6),
  location_lng DECIMAL(9,6),
  status ENUM('open','fulfilled','cancelled') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  request_id INT,
  date_donated DATE,
  units INT,
  status ENUM('pledged','completed','cancelled') DEFAULT 'pledged',
  FOREIGN KEY (donor_id) REFERENCES donors(id),
  FOREIGN KEY (request_id) REFERENCES blood_requests(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  body TEXT,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
