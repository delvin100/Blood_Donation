CREATE DATABASE IF NOT EXISTS ebloodbank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ebloodbank;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS seekers;
DROP TABLE IF EXISTS donors;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS donor_verifications;
DROP TABLE IF EXISTS emergency_requests;
DROP TABLE IF EXISTS blood_inventory;
DROP TABLE IF EXISTS organizations;
SET FOREIGN_KEY_CHECKS = 1;

-- Donors Table
CREATE TABLE donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NULL UNIQUE,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NULL,
  google_id VARCHAR(255) UNIQUE DEFAULT NULL,
  blood_type VARCHAR(50),
  dob DATE,
  availability ENUM('Available','Unavailable') DEFAULT 'Available',
  phone VARCHAR(50) DEFAULT NULL,
  gender ENUM('male','female','other') DEFAULT NULL,
  country VARCHAR(100) DEFAULT 'India',
  state VARCHAR(100) DEFAULT NULL,
  district VARCHAR(100) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  profile_picture VARCHAR(255) DEFAULT NULL,
  reset_code VARCHAR(4) DEFAULT NULL,
  reset_code_expires_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seekers Table
CREATE TABLE seekers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  blood_type VARCHAR(50),
  required_by DATETIME,
  country VARCHAR(100) DEFAULT 'India',
  state VARCHAR(100),
  district VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donations
CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  date DATE,
  units DECIMAL(5,2) DEFAULT 1.00,
  notes TEXT,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reminders
CREATE TABLE reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  reminder_date DATETIME,
  message VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin
CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Organizations Table
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE NOT NULL,
  type ENUM('Hospital', 'Blood Bank', 'Clinic') NOT NULL,
  address TEXT,
  state VARCHAR(100),
  district VARCHAR(100),
  city VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blood Inventory
CREATE TABLE blood_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  blood_group VARCHAR(30) NOT NULL,
  units INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_inventory (org_id, blood_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Emergency Requests
CREATE TABLE emergency_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  blood_group VARCHAR(30) NOT NULL,
  units_required INT NOT NULL,
  urgency_level ENUM('Critical', 'High', 'Moderate') DEFAULT 'High',
  description TEXT,
  status ENUM('Active', 'Fulfilled', 'Cancelled') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donor Verifications
CREATE TABLE donor_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  donor_id INT NOT NULL,
  verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Verified', 'Rejected') DEFAULT 'Verified',
  notes TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
