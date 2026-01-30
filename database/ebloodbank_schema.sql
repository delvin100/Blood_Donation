-- Database Initialization Script
-- Usage: SOURCE /path/to/ebloodbank_schema.sql;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop and Recreate Database
DROP DATABASE IF EXISTS ebloodbank;
CREATE DATABASE ebloodbank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ebloodbank;

-- 2. Drop Tables (Redundant if DB is dropped, but good for safety if running manually)
DROP TABLE IF EXISTS medical_reports;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS org_members;
DROP TABLE IF EXISTS donor_verifications;
DROP TABLE IF EXISTS emergency_requests;
DROP TABLE IF EXISTS blood_inventory;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS seekers;
DROP TABLE IF EXISTS donors;

-- 3. Create Tables

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
  profile_picture TEXT DEFAULT NULL,
  reset_code VARCHAR(10) DEFAULT NULL,
  reset_code_expires_at DATETIME DEFAULT NULL,
  donor_tag VARCHAR(20) UNIQUE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seekers Table (Legacy/Optional)
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

-- Donations Table (Past Donations)
CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  date DATE,
  units DECIMAL(5,2) DEFAULT 1.00,
  hb_level DECIMAL(4,2) NULL,
  blood_pressure VARCHAR(20) NULL,
  notes TEXT,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admins Table
CREATE TABLE admins (
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
  reset_code VARCHAR(10) DEFAULT NULL,
  reset_code_expires_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blood Inventory (Organization Specific)
CREATE TABLE blood_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  blood_group VARCHAR(30) NOT NULL,
  units INT DEFAULT 0,
  min_threshold INT DEFAULT 5,
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
  urgency_level ENUM('Critical', 'High', 'Medium') DEFAULT 'High',
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

-- Organization Members
CREATE TABLE org_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  donor_id INT NOT NULL,
  role ENUM('Member', 'Volunteer') DEFAULT 'Member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member (org_id, donor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  recipient_type ENUM('Donor', 'Organization') NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source_id INT DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Medical Reports
CREATE TABLE medical_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  org_id INT NOT NULL,
  hb_level DECIMAL(4,2),
  blood_pressure VARCHAR(20),
  pulse_rate INT,
  temperature DECIMAL(4,1),
  weight DECIMAL(5,2),
  units_donated DECIMAL(5,2) DEFAULT 1.00,
  blood_group VARCHAR(10),
  rh_factor ENUM('Positive', 'Negative'),
  hiv_status ENUM('Negative', 'Positive') DEFAULT 'Negative',
  hepatitis_b ENUM('Negative', 'Positive') DEFAULT 'Negative',
  hepatitis_c ENUM('Negative', 'Positive') DEFAULT 'Negative',
  syphilis ENUM('Negative', 'Positive') DEFAULT 'Negative',
  malaria ENUM('Negative', 'Positive') DEFAULT 'Negative',
  test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admins (username, password_hash)
VALUES ('admin','$2b$10$s/wNd/VHlfpK4pHMKqC7XehD2sev7CLaGPJkmpP52agx8JcAbJbXi');

SET FOREIGN_KEY_CHECKS = 1;

-- END OF SCRIPT
