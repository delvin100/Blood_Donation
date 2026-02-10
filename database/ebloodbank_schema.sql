-- Database Initialization Script

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blood_type (blood_type),
  INDEX idx_location (city, district)
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
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_seekers_blood (blood_type),
  INDEX idx_seekers_district (district)
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_org_city (city),
  INDEX idx_org_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donations Table (Past Donations)
CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  org_id INT DEFAULT NULL,
  date DATE,
  units DECIMAL(5,2) DEFAULT 1.00,
  hb_level DECIMAL(4,2) NULL,
  blood_pressure VARCHAR(20) NULL,
  notes TEXT,
  INDEX idx_donations_donor (donor_id),
  INDEX idx_donations_org (org_id),
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admins Table
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('Active', 'Disabled') DEFAULT 'Active',
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
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_recipient (recipient_id, recipient_type, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Broadcasts (Global)
CREATE TABLE broadcasts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target ENUM('all', 'donors', 'organizations') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
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
  blood_group VARCHAR(50),
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

-- Organization Activity Logs
CREATE TABLE org_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org_logs_org_id (org_id),
  INDEX idx_org_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donor Activity Logs
CREATE TABLE donor_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  INDEX idx_donor_logs_donor_id (donor_id),
  INDEX idx_donor_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin Activity Logs
CREATE TABLE admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_logs_admin_id (admin_id),
  INDEX idx_admin_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


INSERT INTO admins (username, password_hash)
VALUES ('admin','$2b$10$s/wNd/VHlfpK4pHMKqC7XehD2sev7CLaGPJkmpP52agx8JcAbJbXi');

-- =========================
-- DONORS
-- =========================
INSERT INTO donors
(username, full_name, email, password_hash, blood_type, dob, availability, phone, gender, state, district, city, donor_tag)
VALUES
('jmathew', 'Joseph Mathew', 'joseph.mathew@gmail.com', NULL, 'A+', '1996-04-12', 'Available', '9876543210', 'male', 'Kerala', 'Kottayam', 'Pala', 'DON-000001'),
('tgeorge', 'Thomas George', 'thomas.george@gmail.com', NULL, 'O+', '1994-08-20', 'Available', '9876543211', 'male', 'Kerala', 'Kottayam', 'Ettumanoor', 'DON-000002'),
('amary', 'Annie Mary', 'annie.mary@gmail.com', NULL, 'B+', '1998-01-05', 'Unavailable', '9876543212', 'female', 'Kerala', 'Kottayam', 'Changanassery', 'DON-000003'),
('pjohn', 'Paul John', 'paul.john@gmail.com', NULL, 'AB+', '1992-06-18', 'Available', '9876543213', 'male', 'Kerala', 'Kottayam', 'Kanjirappally', 'DON-000004'),
('rthomas', 'Riya Thomas', 'riya.thomas@gmail.com', NULL, 'O-', '1999-11-09', 'Available', '9876543214', 'female', 'Kerala', 'Kottayam', 'Vaikom', 'DON-000005'),
('sjoseph', 'Samuel Joseph', 'samuel.j@gmail.com', NULL, 'A-', '1995-03-22', 'Unavailable', '9876543215', 'male', 'Kerala', 'Kottayam', 'Pampady', 'DON-000006'),
('lmathew', 'Linda Mathew', 'linda.mathew@gmail.com', NULL, 'B-', '2000-07-14', 'Available', '9876543216', 'female', 'Kerala', 'Kottayam', 'Kuravilangad', 'DON-000007'),
('ajames', 'Alex James', 'alex.james@gmail.com', NULL, 'AB-', '1993-12-01', 'Available', '9876543217', 'male', 'Kerala', 'Kottayam', 'Pala', 'DON-000008'),
('mgeorge', 'Maria George', 'maria.george@gmail.com', NULL, 'A+', '1997-09-27', 'Available', '9876543218', 'female', 'Kerala', 'Kottayam', 'Changanassery', 'DON-000009'),
('vpaul', 'Vincent Paul', 'vincent.paul@gmail.com', NULL, 'O+', '1991-02-10', 'Unavailable', '9876543219', 'male', 'Kerala', 'Kottayam', 'Ettumanoor', 'DON-000010');

-- =========================
-- SET DONOR PASSWORD = 12345678
-- =========================
UPDATE donors
SET password_hash = '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS';

-- =========================
-- ORGANIZATIONS
-- =========================
INSERT INTO organizations
(name, email, phone, password_hash, license_number, type, address, state, district, city, verified)
VALUES
('Caritas Hospital', 'info@caritashospital.org', '04822260000', NULL, 'LIC-KTM-001', 'Hospital', 'Thellakom PO', 'Kerala', 'Kottayam', 'Thellakom', TRUE),
('Government Medical College Kottayam', 'gmckottayam@kerala.gov.in', '04812562000', NULL, 'LIC-KTM-002', 'Hospital', 'Gandhinagar', 'Kerala', 'Kottayam', 'Gandhinagar', TRUE),
('Lourdes Hospital', 'contact@lourdeskottayam.com', '04812300000', NULL, 'LIC-KTM-003', 'Hospital', 'Collectorate PO', 'Kerala', 'Kottayam', 'Kottayam', TRUE),
('SH Medical Centre', 'admin@shmedical.org', '04812420000', NULL, 'LIC-KTM-004', 'Hospital', 'Changanassery', 'Kerala', 'Kottayam', 'Changanassery', TRUE),
('Marian Medical Centre', 'info@marianmedicalcentre.com', '04822270000', NULL, 'LIC-KTM-005', 'Hospital', 'Pala', 'Kerala', 'Kottayam', 'Pala', TRUE);

-- =========================
-- SET ORGANIZATION PASSWORD = 12345678
-- =========================
UPDATE organizations
SET password_hash = '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS';

SET FOREIGN_KEY_CHECKS = 1;

-- END OF SCRIPT
