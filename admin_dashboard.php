<?php
session_start();

// Check if user is admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Location: admin_login.php');
    exit;
}

// Include database connection from db.php
require_once 'db.php';

// Get PDO connection
$pdo = get_pdo();

// Handle admin actions
$message = '';
$message_type = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    try {
    switch ($action) {
            case 'add_donor':
                // Server-side validation
                $full_name = trim($_POST['full_name'] ?? '');
                $email = trim($_POST['email'] ?? '');
                $blood_type = trim($_POST['blood_type'] ?? '');
                $dob = trim($_POST['dob'] ?? '');
                $phone = trim($_POST['phone'] ?? '');
                $gender = trim($_POST['gender'] ?? '');
                $city = trim($_POST['city'] ?? '');
                $state = trim($_POST['state'] ?? '');
                $country = trim($_POST['country'] ?? '');
                $district = trim($_POST['district'] ?? '');
                $availability = trim($_POST['availability'] ?? 'Available');

                // Basic field validation
                if ($full_name === '' || $email === '' || $blood_type === '' || $dob === '' || $phone === '' || $gender === '' || $city === '' || $state === '' || $country === '' || $district === '') {
                    $message = 'Please complete all required fields.';
                    $message_type = 'error';
                    break;
                }

                // Email validation
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $message = 'Please enter a valid email address.';
                    $message_type = 'error';
                    break;
                }

                // Phone validation
                if (!preg_match('/^[0-9]{10}$/', $phone)) {
                    $message = 'Phone number must be exactly 10 digits.';
                    $message_type = 'error';
                    break;
                }

                // Gender validation
                if (!in_array($gender, ['male', 'female', 'other'])) {
                    $message = 'Please select a valid gender.';
                    $message_type = 'error';
                    break;
                }

                // Age validation
                $birthDate = new DateTime($dob);
                $today = new DateTime();
                $age = $today->diff($birthDate)->y;
                if ($age < 18 || $age > 65) {
                    $message = 'Age must be between 18 and 65 years.';
                    $message_type = 'error';
                    break;
                }

                // Check for duplicate email
                $stmt = $pdo->prepare("SELECT id FROM donors WHERE email = ?");
                $stmt->execute([$email]);
                if ($stmt->fetch()) {
                    $message = 'Email address already exists. Please use a different email.';
                    $message_type = 'error';
                    break;
                }

                // Insert donor if all validations pass
                $stmt = $pdo->prepare("INSERT INTO donors (full_name, email, password_hash, blood_type, dob, phone, gender, availability, city, state, country, district) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $full_name,
                    $email,
                    password_hash('default123', PASSWORD_DEFAULT), // Default password for admin-added donors
                    $blood_type,
                    $dob,
                    $phone,
                    $gender,
                    $availability,
                    $city,
                    $state,
                    $country,
                    $district
                ]);
                $message = 'Donor added successfully!';
                $message_type = 'success';
                break;
                
            case 'edit_donor':
                $stmt = $pdo->prepare("UPDATE donors SET full_name=?, email=?, blood_type=?, phone=?, city=?, state=?, country=?, availability=? WHERE id=?");
                $stmt->execute([
                    $_POST['full_name'],
                    $_POST['email'],
                    $_POST['blood_type'],
                    $_POST['phone'],
                    $_POST['city'],
                    $_POST['state'],
                    $_POST['country'],
                    $_POST['availability'],
                    $_POST['donor_id']
                ]);
                $message = 'Donor updated successfully!';
                $message_type = 'success';
                break;
            
        case 'delete_donor':
                $stmt = $pdo->prepare("DELETE FROM donors WHERE id = ?");
                $stmt->execute([$_POST['donor_id']]);
                $message = 'Donor deleted successfully!';
                $message_type = 'success';
            break;
            
            case 'add_seeker':
                $stmt = $pdo->prepare("INSERT INTO seekers (full_name, email, phone, blood_type, required_by) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([
                    $_POST['patient_name'],
                    $_POST['email'],
                    $_POST['phone'],
                    $_POST['blood_group'],
                    $_POST['required_date']
                ]);
                $message = 'Blood request added successfully!';
                $message_type = 'success';
                break;
                
            case 'edit_seeker':
                $stmt = $pdo->prepare("UPDATE seekers SET full_name=?, email=?, phone=?, blood_type=?, required_by=? WHERE id=?");
                $stmt->execute([
                    $_POST['patient_name'],
                    $_POST['email'] ?? null,
                    $_POST['phone'],
                    $_POST['blood_group'],
                    $_POST['required_date'] ?? null,
                    $_POST['seeker_id']
                ]);
                $message = 'Blood request updated successfully!';
                $message_type = 'success';
                break;
                
            case 'delete_seeker':
                $stmt = $pdo->prepare("DELETE FROM seekers WHERE id = ?");
                $stmt->execute([$_POST['seeker_id']]);
                $message = 'Blood request deleted successfully!';
                $message_type = 'success';
            break;
        }
    } catch(PDOException $e) {
        $message = 'Error: ' . $e->getMessage();
        $message_type = 'error';
    }
}

// Get filter parameters
$blood_type_filter = $_GET['blood_type'] ?? '';
$availability_filter = $_GET['availability'] ?? '';
$search = $_GET['search'] ?? '';

// Build query conditions
$donor_conditions = [];
$donor_params = [];

if ($blood_type_filter) {
    $donor_conditions[] = "blood_type = ?";
    $donor_params[] = $blood_type_filter;
}

if ($availability_filter) {
    $donor_conditions[] = "availability = ?";
    $donor_params[] = $availability_filter;
}

if ($search) {
    $donor_conditions[] = "(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";
    $search_param = "%$search%";
    $donor_params = array_merge($donor_params, [$search_param, $search_param, $search_param]);
}

$donor_where = $donor_conditions ? "WHERE " . implode(" AND ", $donor_conditions) : "";

// Fetch donors
$donors_query = "SELECT * FROM donors $donor_where ORDER BY created_at DESC";
$donors_stmt = $pdo->prepare($donors_query);
$donors_stmt->execute($donor_params);
$donors = $donors_stmt->fetchAll();

// Fetch seekers
$seekers_query = "SELECT * FROM seekers ORDER BY created_at DESC";
$seekers_stmt = $pdo->prepare($seekers_query);
$seekers_stmt->execute();
$seekers = $seekers_stmt->fetchAll();

// Calculate statistics
$total_donors = count($donors);
$total_seekers = count($seekers);

// Get blood type statistics
$blood_stats_query = "SELECT blood_type, COUNT(*) as count FROM donors GROUP BY blood_type";
$blood_stats_stmt = $pdo->query($blood_stats_query);
$blood_stats = $blood_stats_stmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Blood Donation System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-red: #dc2626;
            --primary-red-light: #fef2f2;
            --primary-red-dark: #991b1b;
            --secondary-blue: #3b82f6;
            --secondary-green: #10b981;
            --secondary-purple: #8b5cf6;
            --secondary-orange: #f59e0b;
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-300: #d1d5db;
            --gray-400: #9ca3af;
            --gray-500: #6b7280;
            --gray-600: #4b5563;
            --gray-700: #374151;
            --gray-800: #1f2937;
            --gray-900: #111827;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #fef7f7 0%, #fef2f2 50%, #fef7f7 100%);
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        /* Animated background elements */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 20%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(239, 68, 68, 0.02) 0%, transparent 50%),
                radial-gradient(circle at 40% 60%, rgba(185, 28, 28, 0.02) 0%, transparent 50%);
            z-index: -2;
            pointer-events: none;
            animation: backgroundFloat 20s ease-in-out infinite;
        }
        
        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dc2626' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            z-index: -1;
            pointer-events: none;
            animation: patternMove 30s linear infinite;
        }

        @keyframes backgroundFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(1deg); }
        }

        @keyframes patternMove {
            0% { transform: translateX(0px) translateY(0px); }
            100% { transform: translateX(60px) translateY(60px); }
        }

        /* Navigation */
        .navbar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(220, 38, 38, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .navbar-brand {
            font-weight: 700;
            font-size: 1.5rem;
            color: var(--primary-red);
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .navbar-brand:hover {
            transform: scale(1.05);
            color: var(--primary-red-dark);
        }

        /* Main container */
        .main-container {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(220, 38, 38, 0.1);
            position: relative;
            overflow: hidden;
            margin: 2rem;
            min-height: calc(100vh - 8rem);
        }
        
        .main-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, 
                var(--primary-red) 0%, 
                var(--secondary-blue) 25%, 
                var(--secondary-green) 50%, 
                var(--secondary-purple) 75%, 
                var(--secondary-orange) 100%);
            animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
        }

        /* Dashboard cards */
        .dashboard-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2rem;
            border: 1px solid rgba(220, 38, 38, 0.1);
            box-shadow: 
                0 10px 30px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.2);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            cursor: pointer;
        }

        .dashboard-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
                rgba(220, 38, 38, 0.05) 0%, 
                rgba(255, 255, 255, 0.1) 50%, 
                rgba(220, 38, 38, 0.05) 100%);
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .dashboard-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 
                0 25px 50px rgba(220, 38, 38, 0.15),
                0 0 0 1px rgba(220, 38, 38, 0.2);
        }

        .dashboard-card:hover::before {
            opacity: 1;
        }

        /* Card icons */
        .card-icon {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            position: relative;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-icon::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border-radius: 22px;
            background: linear-gradient(135deg, 
                rgba(220, 38, 38, 0.2), 
                rgba(255, 255, 255, 0.1), 
                rgba(220, 38, 38, 0.2));
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .dashboard-card:hover .card-icon {
            transform: scale(1.1) rotate(5deg);
        }

        .dashboard-card:hover .card-icon::before {
            opacity: 1;
        }

        .card-icon i {
            font-size: 2rem;
            transition: all 0.3s ease;
        }

        .dashboard-card:hover .card-icon i {
            transform: scale(1.1);
        }

        /* Icon color schemes */
        .icon-donors {
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            color: var(--primary-red);
        }
        
        .icon-seekers {
            background: linear-gradient(135deg, #fef7f7, #fce7f3);
            color: #be185d;
        }
        
        .icon-organizations {
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            color: var(--secondary-blue);
        }
        
        .icon-requests {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            color: var(--secondary-green);
        }

        /* Card content */
        .card-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--gray-800);
            margin-bottom: 0.5rem;
            text-align: center;
            transition: all 0.3s ease;
        }

        .card-subtitle {
            font-size: 1rem;
            color: var(--gray-600);
            text-align: center;
            margin-bottom: 1.5rem;
            transition: all 0.3s ease;
        }

        .dashboard-card:hover .card-title {
            color: var(--primary-red);
            transform: translateY(-2px);
        }

        .dashboard-card:hover .card-subtitle {
            color: var(--gray-700);
            transform: translateY(-2px);
        }

        /* Action button */
        .action-btn {
            background: linear-gradient(135deg, var(--primary-red), var(--primary-red-dark));
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
            position: relative;
            overflow: hidden;
        }

        .action-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent, 
                rgba(255, 255, 255, 0.2), 
                transparent);
            transition: left 0.5s ease;
        }

        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
        }

        .action-btn:hover::before {
            left: 100%;
        }

        .action-btn i {
            transition: transform 0.3s ease;
        }

        .action-btn:hover i {
            transform: translateX(3px);
        }

        /* Details panel */
        .details-panel {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 2rem;
            margin: 2rem;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(220, 38, 38, 0.1);
            animation: slideInUp 0.5s ease-out;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .detail-item {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border: 1px solid rgba(220, 38, 38, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .detail-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--primary-red);
            transform: scaleY(0);
            transition: transform 0.3s ease;
        }

        .detail-item:hover {
            transform: translateX(8px);
            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.15);
            border-color: var(--primary-red);
        }

        .detail-item:hover::before {
            transform: scaleY(1);
        }

        /* Status badges */
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-pending {
            background: rgba(245, 158, 11, 0.1);
            color: #d97706;
            border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .status-approved {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-rejected {
            background: rgba(239, 68, 68, 0.1);
            color: #dc2626;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-active {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        /* Buttons */
        .btn {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.875rem;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: var(--primary-red);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-red-dark);
            transform: translateY(-1px);
        }

        .btn-success {
            background: var(--secondary-green);
            color: white;
        }

        .btn-success:hover {
            background: #059669;
            transform: translateY(-1px);
        }

        .btn-warning {
            background: var(--secondary-orange);
            color: white;
        }

        .btn-warning:hover {
            background: #d97706;
            transform: translateY(-1px);
        }

        .btn-danger {
            background: #ef4444;
            color: white;
        }

        .btn-danger:hover {
            background: #dc2626;
            transform: translateY(-1px);
        }

        /* Animations */
        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .slide-in-left {
            animation: slideInLeft 0.6s ease-out;
        }

        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .slide-in-right {
            animation: slideInRight 0.6s ease-out;
        }

        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .main-container {
                margin: 1rem;
                border-radius: 16px;
            }
            
            .dashboard-card {
                padding: 1.5rem;
                border-radius: 16px;
            }
            
            .card-icon {
                width: 60px;
                height: 60px;
            }
            
            .card-icon i {
                font-size: 1.5rem;
            }
            
            .card-title {
                font-size: 1.25rem;
            }
        }

        /* Loading animation */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Success/Error messages */
        .alert {
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideInDown 0.5s ease-out;
        }

        @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.1);
            color: #dc2626;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="flex justify-between items-center h-20 px-6 lg:px-8">
                <div class="flex items-center space-x-4">
                    <div class="relative group">
                        <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
                            <i class="fas fa-heartbeat text-white text-xl"></i>
                    </div>
                </div>
                    <div>
                        <h1 class="navbar-brand">Admin Dashboard</h1>
                        <p class="text-sm text-gray-500 font-medium">Blood Donation Management</p>
                    </div>
                </div>
            <div class="flex items-center space-x-6">
                    <a href="index.php" class="flex items-center px-6 py-3 text-gray-600 hover:text-red-600 transition-all duration-300 rounded-xl hover:bg-red-50 group">
                        <i class="fas fa-home mr-3 group-hover:scale-110 transition-transform"></i> 
                        <span class="font-medium text-lg">Home</span>
                    </a>
                    <a href="admin_logout.php" class="action-btn px-6 py-2">
                        <i class="fas fa-sign-out-alt mr-2"></i> 
                        <span class="text-base">Logout</span>
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="main-container">
        <!-- Success/Error Messages -->
        <?php if ($message): ?>
        <div class="alert <?php echo $message_type === 'success' ? 'alert-success' : 'alert-error'; ?>">
            <i class="fas <?php echo $message_type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'; ?> text-xl"></i>
            <span class="font-medium"><?php echo htmlspecialchars($message); ?></span>
        </div>
        <?php endif; ?>

        <!-- Dashboard Header -->
        <div class="text-center py-8 fade-in">
            <h2 class="text-4xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
            <p class="text-lg text-gray-600 max-w-2xl mx-auto">Manage blood donors and seekers with ease. Monitor all activities from this centralized control panel.</p>
        </div>

        <!-- Main Dashboard Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 px-8 pb-8 max-w-4xl mx-auto">
            
            <!-- 1. DONORS CARD -->
            <div class="dashboard-card slide-in-left" onclick="showDonorsList()" style="animation-delay: 0.1s;">
                <div class="card-icon icon-donors">
                    <i class="fas fa-users"></i>
                </div>
                <h3 class="card-title">Blood Donors</h3>
                <p class="card-subtitle">
                    <span class="text-2xl font-bold text-red-600"><?php echo $total_donors; ?></span> registered donors
                </p>
                <div class="action-btn">
                    <span>View All Donors</span>
                    <i class="fas fa-arrow-right"></i>
                </div>
            </div>

            <!-- 2. BLOOD SEEKERS CARD -->
            <div class="dashboard-card slide-in-left" onclick="showSeekersList()" style="animation-delay: 0.2s;">
                <div class="card-icon icon-seekers">
                    <i class="fas fa-heartbeat"></i>
                </div>
                <h3 class="card-title">Blood Requests</h3>
                <p class="card-subtitle">
                    <span class="text-2xl font-bold text-pink-600"><?php echo $total_seekers; ?></span> active requests
                </p>
                <div class="action-btn">
                    <span>View All Requests</span>
                    <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        </div>

        <!-- Quick Stats Section -->
        <div class="px-8 pb-8">
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 fade-in max-w-4xl mx-auto" style="animation-delay: 0.5s;">
                <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <i class="fas fa-chart-line text-red-500 mr-3"></i>
                    Quick Statistics
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-red-600 mb-2"><?php echo $total_donors; ?></div>
                        <div class="text-sm text-gray-600 font-medium">Total Donors</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-pink-600 mb-2"><?php echo $total_seekers; ?></div>
                        <div class="text-sm text-gray-600 font-medium">Blood Requests</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-green-600 mb-2"><?php echo count(array_filter($donors, fn($d) => ($d['availability'] ?? 'Available') === 'Available')); ?></div>
                        <div class="text-sm text-gray-600 font-medium">Available Donors</div>
                    </div>
                    <div class="text-center">
                        <div class="text-3xl font-bold text-orange-600 mb-2"><?php echo count(array_filter($donors, fn($d) => ($d['availability'] ?? 'Available') === 'Unavailable')); ?></div>
                        <div class="text-sm text-gray-600 font-medium">Unavailable Donors</div>
                    </div>
                </div>

                <!-- Blood Type Distribution -->
                <div class="border-t border-gray-200 pt-6">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-tint text-red-500 mr-2"></i>
                        Blood Type Distribution
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <?php 
                        $blood_types = ['A+', 'A-', 'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'AB+', 'AB-', 'B+', 'B-', 'Bombay Blood Group', 'INRA', 'O+', 'O-'];
                        foreach($blood_types as $type): 
                            $count = 0;
                            foreach($blood_stats as $stat) {
                                if($stat['blood_type'] === $type) {
                                    $count = $stat['count'];
                                    break;
                                }
                            }
                        ?>
                        <div class="text-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 border border-transparent transition-all duration-300 transform hover:scale-105" 
                             onclick="showBloodTypeDetails('<?php echo $type; ?>')">
                            <div class="text-lg font-bold text-gray-800"><?php echo $count; ?></div>
                            <div class="text-sm text-gray-600"><?php echo $type; ?></div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Management Controls -->
        <div class="px-8 pb-8">
            <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 fade-in max-w-6xl mx-auto" style="animation-delay: 0.6s;">
                <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <i class="fas fa-cogs text-red-500 mr-3"></i>
                    Management Controls
                </h3>
                
                <!-- Filter and Search Controls -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <!-- Search Section -->
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div class="flex items-center mb-3">
                            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas fa-search text-white"></i>
                    </div>
                            <h4 class="text-lg font-semibold text-gray-800">Search by Name</h4>
                        </div>
                        <input type="text" id="searchInput" placeholder="Search donors by name..." 
                               class="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300">
                    </div>
                    
                    <!-- Blood Type Filter Section -->
                    <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                        <div class="flex items-center mb-3">
                            <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas fa-tint text-white"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-800">Blood Type Filter</h4>
                        </div>
                        <select id="bloodTypeFilter" class="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300">
                            <option value="">Select Blood Type</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="A1+">A1+</option>
                            <option value="A1-">A1-</option>
                            <option value="A1B+">A1B+</option>
                            <option value="A1B-">A1B-</option>
                            <option value="A2+">A2+</option>
                            <option value="A2-">A2-</option>
                            <option value="A2B+">A2B+</option>
                            <option value="A2B-">A2B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="Bombay Blood Group">Bombay Blood Group</option>
                            <option value="INRA">INRA</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                    </div>
                    
                    <!-- Availability Filter Section -->
                    <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                        <div class="flex items-center mb-3">
                            <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas fa-heartbeat text-white"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-800">Availability Filter</h4>
                        </div>
                        <select id="availabilityFilter" class="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300">
                            <option value="">Select Availability</option>
                            <option value="Available">Available</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-3 mb-6">
                    <button onclick="showAddDonorForm()" class="btn btn-success">
                        <i class="fas fa-plus"></i>
                        <span>Add Donor</span>
                    </button>
                    <button onclick="exportData()" class="btn btn-warning">
                        <i class="fas fa-download"></i>
                        <span>Export Data</span>
                    </button>
                    <button onclick="refreshData()" class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i>
                        <span>Refresh</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Details Panel (Hidden by default) -->
        <div id="detailsPanel" class="hidden details-panel">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <button id="backButton" onclick="goBack()" class="btn btn-primary mr-4 hidden">
                        <i class="fas fa-arrow-left"></i>
                        <span>Back</span>
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800" id="detailsTitle">Item Details</h2>
                        <p class="text-gray-600 mt-1">Manage and view detailed information</p>
                </div>
                </div>
                <button onclick="closeDetailsPanel()" class="btn btn-danger">
                    <i class="fas fa-times"></i>
                    <span>Close</span>
                </button>
            </div>
            <div id="detailsContent" class="space-y-4">
                <!-- Details will be populated here -->
        </div>
        </div>
    </div>

    <script>
        // Data arrays from PHP
        const donors = <?php echo json_encode($donors); ?>;
        const seekers = <?php echo json_encode($seekers); ?>;

        // Navigation history
        let navigationHistory = [];

        function showDetailsPanel(title, content, showBackButton = false) {
            document.getElementById('detailsTitle').textContent = title;
            document.getElementById('detailsContent').innerHTML = content;
            document.getElementById('detailsPanel').classList.remove('hidden');
            
            // Show/hide back button
            const backButton = document.getElementById('backButton');
            if (showBackButton) {
                backButton.classList.remove('hidden');
            } else {
                backButton.classList.add('hidden');
            }
            
            document.getElementById('detailsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function closeDetailsPanel() {
            document.getElementById('detailsPanel').classList.add('hidden');
            navigationHistory = []; // Clear history when closing
        }

        function goBack() {
            try {
                if (navigationHistory && navigationHistory.length > 0) {
                    const previousState = navigationHistory.pop();
                    showDetailsPanel(previousState.title, previousState.content, navigationHistory.length > 0);
                } else {
                    // If no history, go back to main dashboard
                    closeDetailsPanel();
                }
            } catch (error) {
                console.error('Error in goBack function:', error);
                closeDetailsPanel();
            }
        }

        function pushToHistory(title, content) {
            if (!navigationHistory) {
                navigationHistory = [];
            }
            navigationHistory.push({ title, content });
        }

        function showDonorsList() {
            let content = `
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    ${donors.map((donor, index) => `
                        <div class="detail-item" onclick="showDonorDetails(${donor.id})">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-red-600 font-bold text-lg mr-4">
                                        ${(donor.full_name || 'D').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-900 text-lg">${donor.full_name || 'N/A'}</h4>
                                        <p class="text-sm text-gray-600 flex items-center">
                                            <i class="fas fa-envelope mr-1"></i>
                                            ${donor.email || 'N/A'}
                                        </p>
                                        <p class="text-xs text-gray-500">${donor.city || 'N/A'}, ${donor.state || 'N/A'}</p>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <span class="status-badge ${donor.availability === 'Available' ? 'status-approved' : 'status-rejected'}">
                                        ${donor.availability || 'Available'}
                                    </span>
                                    <span class="status-badge status-pending">
                                        ${donor.blood_type || 'N/A'}
                                    </span>
                                    <i class="fas fa-arrow-right text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            showDetailsPanel('👥 All Blood Donors', content);
        }

        function showSeekersList() {
            let content = `
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    ${seekers.map((seeker, index) => `
                        <div class="detail-item" onclick="showSeekerDetails(${seeker.id})">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center text-pink-600 font-bold text-lg mr-4">
                                        ${(seeker.full_name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-900 text-lg">${seeker.full_name || 'N/A'}</h4>
                                        <p class="text-sm text-gray-600 flex items-center">
                                            <i class="fas fa-envelope mr-1"></i>
                                            ${seeker.email || 'N/A'}
                                        </p>
                                        <p class="text-xs text-gray-500">${seeker.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <span class="status-badge status-pending">
                                        ${seeker.blood_type || 'N/A'}
                                    </span>
                                    <i class="fas fa-arrow-right text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            showDetailsPanel('🩸 All Blood Requests', content);
        }


        function showDonorDetails(donorId) {
            const donor = donors.find(d => d.id == donorId);
            if (!donor) return;
            
            const content = `
                <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="space-y-6">
                                    <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-red-600 mr-4">
                                    <i class="fas fa-user"></i>
                                        </div>
                                <div>
                                    <span class="text-sm text-gray-600 font-medium">Full Name</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.full_name || 'N/A'}</p>
                                </div>
                                    </div>
                                    <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-blue-600 mr-4">
                                    <i class="fas fa-envelope"></i>
                                    </div>
                                <div>
                                    <span class="text-sm text-gray-600 font-medium">Email</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.email || 'N/A'}</p>
                                </div>
                            </div>
                                    <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center text-purple-600 mr-4">
                                    <i class="fas fa-phone"></i>
                                        </div>
                                        <div>
                                    <span class="text-sm text-gray-600 font-medium">Phone</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    </div>
                        <div class="space-y-6">
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-red-600 mr-4">
                                    <i class="fas fa-tint"></i>
                            </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Blood Type</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.blood_type || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center text-orange-600 mr-4">
                                    <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Location</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.city || 'N/A'}, ${donor.state || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center text-indigo-600 mr-4">
                                    <i class="fas fa-flag"></i>
                            </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Country</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.country || 'N/A'}</p>
                            </div>
                        </div>
                            <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center text-pink-600 mr-4">
                                    <i class="fas fa-heart"></i>
                                </div>
                                <div>
                                    <span class="text-sm text-gray-600 font-medium">Availability</span>
                                    <p class="font-bold text-lg text-gray-900">${donor.availability || 'Available'}</p>
                                </div>
                            </div>
                    </div>
                </div>
                    <div class="mt-8 pt-6 border-t border-gray-200">
                        <div class="flex space-x-3">
                            <button onclick="showEditDonorForm(${donor.id})" class="btn btn-primary">
                                <i class="fas fa-edit"></i>
                                <span>Edit Donor</span>
                            </button>
                            <button onclick="deleteDonor(${donor.id})" class="btn btn-danger">
                                <i class="fas fa-trash"></i>
                                <span>Delete Donor</span>
                        </button>
                        </div>
                    </div>
                </div>
            `;
            // Push current state to history before showing details
            const currentContent = document.getElementById('detailsContent').innerHTML;
            const currentTitle = document.getElementById('detailsTitle').textContent;
            pushToHistory(currentTitle, currentContent);
            
            showDetailsPanel('👥 Donor Details', content, true);
        }

        function showSeekerDetails(seekerId) {
            const seeker = seekers.find(s => s.id == seekerId);
            if (!seeker) return;
            
            const content = `
                <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="space-y-6">
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center text-pink-600 mr-4">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <span class="text-sm text-gray-600 font-medium">Patient Name</span>
                                    <p class="font-bold text-lg text-gray-900">${seeker.full_name || 'N/A'}</p>
                                </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-blue-600 mr-4">
                                    <i class="fas fa-envelope"></i>
                                </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Email</span>
                                    <p class="font-bold text-lg text-gray-900">${seeker.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center text-green-600 mr-4">
                                    <i class="fas fa-phone"></i>
                                </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Phone</span>
                                    <p class="font-bold text-lg text-gray-900">${seeker.phone || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center text-orange-600 mr-4">
                                    <i class="fas fa-calendar"></i>
                                </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Required By</span>
                                    <p class="font-bold text-lg text-gray-900">${seeker.required_by ? new Date(seeker.required_by).toLocaleString() : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                        <div class="space-y-6">
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-red-600 mr-4">
                                    <i class="fas fa-tint"></i>
                                </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Blood Type Required</span>
                                    <p class="font-bold text-lg text-gray-900">${seeker.blood_type || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center text-purple-600 mr-4">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Request Date</span>
                                    <p class="font-bold text-lg text-gray-900">${seeker.created_at ? new Date(seeker.created_at).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center">
                                <div class="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center text-indigo-600 mr-4">
                                    <i class="fas fa-hashtag"></i>
                                </div>
                            <div>
                                    <span class="text-sm text-gray-600 font-medium">Request ID</span>
                                    <p class="font-bold text-lg text-gray-900">#${seeker.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
                    <div class="mt-8 pt-6 border-t border-gray-200">
                        <button onclick="deleteSeeker(${seeker.id})" class="btn btn-danger">
                            <i class="fas fa-trash"></i>
                            <span>Delete Request</span>
                    </button>
                    </div>
                </div>
            `;
            // Push current state to history before showing details
            const currentContent = document.getElementById('detailsContent').innerHTML;
            const currentTitle = document.getElementById('detailsTitle').textContent;
            pushToHistory(currentTitle, currentContent);
            
            showDetailsPanel('🩸 Blood Request Details', content, true);
        }

        // CRUD Operations
        function deleteDonor(donorId) {
            if (confirm('Are you sure you want to delete this donor?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete_donor">
                    <input type="hidden" name="donor_id" value="${donorId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function deleteSeeker(seekerId) {
            if (confirm('Are you sure you want to delete this blood request?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete_seeker">
                    <input type="hidden" name="seeker_id" value="${seekerId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        // Form Functions
        function showAddDonorForm() {
            const content = `
                <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-user-plus text-red-500 mr-3"></i>
                        Add New Donor
                    </h3>
                    <form method="POST" class="space-y-6" onsubmit="return validateAddDonorForm()">
                        <input type="hidden" name="action" value="add_donor">
                        
                        <!-- Personal Information Section -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i class="fas fa-user text-blue-500 mr-2"></i>
                                Personal Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                    <input type="text" name="full_name" id="add-full-name" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter full name" onblur="validateField('full_name')">
                                    <div class="text-xs text-red-600 mt-1" data-error="full_name"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                                    <input type="email" name="email" id="add-email" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter email address" onblur="validateField('email')">
                                    <div class="text-xs text-red-600 mt-1" data-error="email"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                    <input type="tel" name="phone" id="add-phone" required pattern="[0-9]{10}" maxlength="10"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter 10-digit phone number" onblur="validateField('phone')" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                    <div class="text-xs text-red-600 mt-1" data-error="phone"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                                    <input type="date" name="dob" id="add-dob" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           onblur="validateField('dob')">
                                    <div class="text-xs text-red-600 mt-1" data-error="dob"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                                    <select name="gender" id="add-gender" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                            onchange="validateField('gender')">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <div class="text-xs text-red-600 mt-1" data-error="gender"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Medical Information Section -->
                        <div class="bg-red-50 rounded-xl p-4">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i class="fas fa-tint text-red-500 mr-2"></i>
                                Medical Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Blood Type *</label>
                                    <select name="blood_type" id="add-blood-type" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                            onchange="validateField('blood_type')">
                                        <option value="">Select Blood Type</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="A1+">A1+</option>
                                        <option value="A1-">A1-</option>
                                        <option value="A1B+">A1B+</option>
                                        <option value="A1B-">A1B-</option>
                                        <option value="A2+">A2+</option>
                                        <option value="A2-">A2-</option>
                                        <option value="A2B+">A2B+</option>
                                        <option value="A2B-">A2B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="Bombay Blood Group">Bombay Blood Group</option>
                                        <option value="INRA">INRA</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                    <div class="text-xs text-red-600 mt-1" data-error="blood_type"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Availability *</label>
                                    <select name="availability" id="add-availability" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300">
                                        <option value="Available">Available</option>
                                        <option value="Unavailable">Unavailable</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Location Information Section -->
                        <div class="bg-green-50 rounded-xl p-4">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i class="fas fa-map-marker-alt text-green-500 mr-2"></i>
                                Location Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                                    <input type="text" name="country" id="add-country" value="India" readonly 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                           style="background-color: #f3f4f6;">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">State *</label>
                                    <select name="state" id="add-state" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                            onchange="validateField('state')">
                                        <option value="">Select State</option>
                                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                                        <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                        <option value="Assam">Assam</option>
                                        <option value="Bihar">Bihar</option>
                                        <option value="Chhattisgarh">Chhattisgarh</option>
                                        <option value="Goa">Goa</option>
                                        <option value="Gujarat">Gujarat</option>
                                        <option value="Haryana">Haryana</option>
                                        <option value="Himachal Pradesh">Himachal Pradesh</option>
                                        <option value="Jharkhand">Jharkhand</option>
                                        <option value="Karnataka">Karnataka</option>
                                        <option value="Kerala">Kerala</option>
                                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                                        <option value="Maharashtra">Maharashtra</option>
                                        <option value="Manipur">Manipur</option>
                                        <option value="Meghalaya">Meghalaya</option>
                                        <option value="Mizoram">Mizoram</option>
                                        <option value="Nagaland">Nagaland</option>
                                        <option value="Odisha">Odisha</option>
                                        <option value="Punjab">Punjab</option>
                                        <option value="Rajasthan">Rajasthan</option>
                                        <option value="Sikkim">Sikkim</option>
                                        <option value="Tamil Nadu">Tamil Nadu</option>
                                        <option value="Telangana">Telangana</option>
                                        <option value="Tripura">Tripura</option>
                                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                                        <option value="Uttarakhand">Uttarakhand</option>
                                        <option value="West Bengal">West Bengal</option>
                                        <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                                        <option value="Chandigarh">Chandigarh</option>
                                        <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                                        <option value="Delhi">Delhi</option>
                                        <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                                        <option value="Ladakh">Ladakh</option>
                                        <option value="Lakshadweep">Lakshadweep</option>
                                        <option value="Puducherry">Puducherry</option>
                                    </select>
                                    <div class="text-xs text-red-600 mt-1" data-error="state"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">District *</label>
                                    <select name="district" id="add-district" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                            disabled onchange="validateField('district')">
                                        <option value="">First select a state</option>
                                    </select>
                                    <div class="text-xs text-red-600 mt-1" data-error="district"></div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">City *</label>
                                    <input type="text" name="city" id="add-city" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter city" onblur="validateField('city')">
                                    <div class="text-xs text-red-600 mt-1" data-error="city"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex space-x-3 pt-4">
                            <button type="submit" class="btn btn-success flex-1">
                                <i class="fas fa-save"></i>
                                <span>Add Donor</span>
                            </button>
                            <button type="button" onclick="closeDetailsPanel()" class="btn btn-danger flex-1">
                                <i class="fas fa-times"></i>
                                <span>Cancel</span>
                            </button>
                        </div>
                    </form>
                </div>
            `;
            showDetailsPanel('➕ Add New Donor', content);
            
            // Setup state-district functionality for the dynamically created form
            setTimeout(() => {
                setupDonorLocationFields();
            }, 100);
        }

        function showEditDonorForm(donorId) {
            const donor = donors.find(d => d.id == donorId);
            if (!donor) return;
            
            const content = `
                <div class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-user-edit text-blue-500 mr-3"></i>
                        Edit Donor
                    </h3>
                    <form method="POST" class="space-y-6">
                        <input type="hidden" name="action" value="edit_donor">
                        <input type="hidden" name="donor_id" value="${donor.id}">
                        
                        <!-- Personal Information Section -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i class="fas fa-user text-blue-500 mr-2"></i>
                                Personal Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                    <input type="text" name="full_name" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter full name" value="${donor.full_name || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                                    <input type="email" name="email" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter email address" value="${donor.email || ''}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                    <input type="tel" name="phone" required pattern="[0-9]{10}" maxlength="10"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter 10-digit phone number" value="${donor.phone || ''}">
                                </div>
                            </div>
                        </div>

                        <!-- Medical Information Section -->
                        <div class="bg-red-50 rounded-xl p-4">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i class="fas fa-tint text-red-500 mr-2"></i>
                                Medical Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Blood Type *</label>
                                    <select name="blood_type" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300">
                                        <option value="">Select Blood Type</option>
                                        <option value="A+" ${donor.blood_type === 'A+' ? 'selected' : ''}>A+</option>
                                        <option value="A-" ${donor.blood_type === 'A-' ? 'selected' : ''}>A-</option>
                                        <option value="A1+" ${donor.blood_type === 'A1+' ? 'selected' : ''}>A1+</option>
                                        <option value="A1-" ${donor.blood_type === 'A1-' ? 'selected' : ''}>A1-</option>
                                        <option value="A1B+" ${donor.blood_type === 'A1B+' ? 'selected' : ''}>A1B+</option>
                                        <option value="A1B-" ${donor.blood_type === 'A1B-' ? 'selected' : ''}>A1B-</option>
                                        <option value="A2+" ${donor.blood_type === 'A2+' ? 'selected' : ''}>A2+</option>
                                        <option value="A2-" ${donor.blood_type === 'A2-' ? 'selected' : ''}>A2-</option>
                                        <option value="A2B+" ${donor.blood_type === 'A2B+' ? 'selected' : ''}>A2B+</option>
                                        <option value="A2B-" ${donor.blood_type === 'A2B-' ? 'selected' : ''}>A2B-</option>
                                        <option value="AB+" ${donor.blood_type === 'AB+' ? 'selected' : ''}>AB+</option>
                                        <option value="AB-" ${donor.blood_type === 'AB-' ? 'selected' : ''}>AB-</option>
                                        <option value="B+" ${donor.blood_type === 'B+' ? 'selected' : ''}>B+</option>
                                        <option value="B-" ${donor.blood_type === 'B-' ? 'selected' : ''}>B-</option>
                                        <option value="Bombay Blood Group" ${donor.blood_type === 'Bombay Blood Group' ? 'selected' : ''}>Bombay Blood Group</option>
                                        <option value="INRA" ${donor.blood_type === 'INRA' ? 'selected' : ''}>INRA</option>
                                        <option value="O+" ${donor.blood_type === 'O+' ? 'selected' : ''}>O+</option>
                                        <option value="O-" ${donor.blood_type === 'O-' ? 'selected' : ''}>O-</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Availability *</label>
                                    <select name="availability" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300">
                                        <option value="Available" ${donor.availability === 'Available' ? 'selected' : ''}>Available</option>
                                        <option value="Unavailable" ${donor.availability === 'Unavailable' ? 'selected' : ''}>Unavailable</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Location Information Section -->
                        <div class="bg-green-50 rounded-xl p-4">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i class="fas fa-map-marker-alt text-green-500 mr-2"></i>
                                Location Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                                    <input type="text" name="country" value="${donor.country || 'India'}" readonly 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                           style="background-color: #f3f4f6;">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">State *</label>
                                    <select name="state" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                            id="edit-donor-state">
                                        <option value="">Select State</option>
                                        <option value="Andhra Pradesh" ${donor.state === 'Andhra Pradesh' ? 'selected' : ''}>Andhra Pradesh</option>
                                        <option value="Arunachal Pradesh" ${donor.state === 'Arunachal Pradesh' ? 'selected' : ''}>Arunachal Pradesh</option>
                                        <option value="Assam" ${donor.state === 'Assam' ? 'selected' : ''}>Assam</option>
                                        <option value="Bihar" ${donor.state === 'Bihar' ? 'selected' : ''}>Bihar</option>
                                        <option value="Chhattisgarh" ${donor.state === 'Chhattisgarh' ? 'selected' : ''}>Chhattisgarh</option>
                                        <option value="Goa" ${donor.state === 'Goa' ? 'selected' : ''}>Goa</option>
                                        <option value="Gujarat" ${donor.state === 'Gujarat' ? 'selected' : ''}>Gujarat</option>
                                        <option value="Haryana" ${donor.state === 'Haryana' ? 'selected' : ''}>Haryana</option>
                                        <option value="Himachal Pradesh" ${donor.state === 'Himachal Pradesh' ? 'selected' : ''}>Himachal Pradesh</option>
                                        <option value="Jharkhand" ${donor.state === 'Jharkhand' ? 'selected' : ''}>Jharkhand</option>
                                        <option value="Karnataka" ${donor.state === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
                                        <option value="Kerala" ${donor.state === 'Kerala' ? 'selected' : ''}>Kerala</option>
                                        <option value="Madhya Pradesh" ${donor.state === 'Madhya Pradesh' ? 'selected' : ''}>Madhya Pradesh</option>
                                        <option value="Maharashtra" ${donor.state === 'Maharashtra' ? 'selected' : ''}>Maharashtra</option>
                                        <option value="Manipur" ${donor.state === 'Manipur' ? 'selected' : ''}>Manipur</option>
                                        <option value="Meghalaya" ${donor.state === 'Meghalaya' ? 'selected' : ''}>Meghalaya</option>
                                        <option value="Mizoram" ${donor.state === 'Mizoram' ? 'selected' : ''}>Mizoram</option>
                                        <option value="Nagaland" ${donor.state === 'Nagaland' ? 'selected' : ''}>Nagaland</option>
                                        <option value="Odisha" ${donor.state === 'Odisha' ? 'selected' : ''}>Odisha</option>
                                        <option value="Punjab" ${donor.state === 'Punjab' ? 'selected' : ''}>Punjab</option>
                                        <option value="Rajasthan" ${donor.state === 'Rajasthan' ? 'selected' : ''}>Rajasthan</option>
                                        <option value="Sikkim" ${donor.state === 'Sikkim' ? 'selected' : ''}>Sikkim</option>
                                        <option value="Tamil Nadu" ${donor.state === 'Tamil Nadu' ? 'selected' : ''}>Tamil Nadu</option>
                                        <option value="Telangana" ${donor.state === 'Telangana' ? 'selected' : ''}>Telangana</option>
                                        <option value="Tripura" ${donor.state === 'Tripura' ? 'selected' : ''}>Tripura</option>
                                        <option value="Uttar Pradesh" ${donor.state === 'Uttar Pradesh' ? 'selected' : ''}>Uttar Pradesh</option>
                                        <option value="Uttarakhand" ${donor.state === 'Uttarakhand' ? 'selected' : ''}>Uttarakhand</option>
                                        <option value="West Bengal" ${donor.state === 'West Bengal' ? 'selected' : ''}>West Bengal</option>
                                        <option value="Andaman and Nicobar Islands" ${donor.state === 'Andaman and Nicobar Islands' ? 'selected' : ''}>Andaman and Nicobar Islands</option>
                                        <option value="Chandigarh" ${donor.state === 'Chandigarh' ? 'selected' : ''}>Chandigarh</option>
                                        <option value="Dadra and Nagar Haveli and Daman and Diu" ${donor.state === 'Dadra and Nagar Haveli and Daman and Diu' ? 'selected' : ''}>Dadra and Nagar Haveli and Daman and Diu</option>
                                        <option value="Delhi" ${donor.state === 'Delhi' ? 'selected' : ''}>Delhi</option>
                                        <option value="Jammu and Kashmir" ${donor.state === 'Jammu and Kashmir' ? 'selected' : ''}>Jammu and Kashmir</option>
                                        <option value="Ladakh" ${donor.state === 'Ladakh' ? 'selected' : ''}>Ladakh</option>
                                        <option value="Lakshadweep" ${donor.state === 'Lakshadweep' ? 'selected' : ''}>Lakshadweep</option>
                                        <option value="Puducherry" ${donor.state === 'Puducherry' ? 'selected' : ''}>Puducherry</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">District *</label>
                                    <select name="district" required 
                                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                            id="edit-donor-district">
                                        <option value="">First select a state</option>
                                    </select>
                            </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">City *</label>
                                    <input type="text" name="city" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                                           placeholder="Enter city" id="edit-donor-city" value="${donor.city || ''}">
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex space-x-3 pt-4">
                            <button type="submit" class="btn btn-success flex-1">
                                <i class="fas fa-save"></i>
                                <span>Update Donor</span>
                            </button>
                            <button type="button" onclick="closeDetailsPanel()" class="btn btn-danger flex-1">
                                <i class="fas fa-times"></i>
                                <span>Cancel</span>
                            </button>
                        </div>
                    </form>
                </div>
            `;
            showDetailsPanel('✏️ Edit Donor', content, true);
            
            // Setup state-district functionality for the edit form
            setTimeout(() => {
                setupEditDonorLocationFields(donor);
            }, 100);
        }

        // Utility Functions

        function exportData() {
            // Comprehensive CSV export functionality with all fields
            let csvContent = "data:text/csv;charset=utf-8,";
            
            // Export Donors with all fields
            csvContent += "DONORS DATA\n";
            csvContent += "ID,Full Name,Email,Phone,Blood Type,Date of Birth,Gender,Availability,Country,State,District,City,Created At\n";
            
            donors.forEach(donor => {
                csvContent += `${donor.id || 'N/A'},"${donor.full_name || 'N/A'}","${donor.email || 'N/A'}","${donor.phone || 'N/A'}","${donor.blood_type || 'N/A'}","${donor.dob || 'N/A'}","${donor.gender || 'N/A'}","${donor.availability || 'N/A'}","${donor.country || 'N/A'}","${donor.state || 'N/A'}","${donor.district || 'N/A'}","${donor.city || 'N/A'}","${donor.created_at || 'N/A'}"\n`;
            });
            
            // Add separator
            csvContent += "\n\n";
            
            // Export Seekers with all fields
            csvContent += "BLOOD REQUESTS DATA\n";
            csvContent += "ID,Patient Name,Email,Phone,Blood Type Required,Required By Date,Request Date\n";
            
            seekers.forEach(seeker => {
                csvContent += `${seeker.id || 'N/A'},"${seeker.full_name || 'N/A'}","${seeker.email || 'N/A'}","${seeker.phone || 'N/A'}","${seeker.blood_type || 'N/A'}","${seeker.required_by || 'N/A'}","${seeker.created_at || 'N/A'}"\n`;
            });
            
            // Add summary statistics
            csvContent += "\n\n";
            csvContent += "SUMMARY STATISTICS\n";
            csvContent += "Total Donors," + donors.length + "\n";
            csvContent += "Total Blood Requests," + seekers.length + "\n";
            csvContent += "Available Donors," + donors.filter(d => d.availability === 'Available').length + "\n";
            csvContent += "Unavailable Donors," + donors.filter(d => d.availability === 'Unavailable').length + "\n";
            
            // Blood type distribution
            csvContent += "\nBLOOD TYPE DISTRIBUTION\n";
            csvContent += "Blood Type,Count\n";
            const bloodTypes = ['A+', 'A-', 'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'AB+', 'AB-', 'B+', 'B-', 'Bombay Blood Group', 'INRA', 'O+', 'O-'];
            bloodTypes.forEach(type => {
                const count = donors.filter(d => d.blood_type === type).length;
                csvContent += `${type},${count}\n`;
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "blood_donation_complete_data.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function refreshData() {
            // Clear all filters and reload the page
            const url = new URL(window.location);
            url.searchParams.delete('search');
            url.searchParams.delete('blood_type');
            url.searchParams.delete('availability');
            window.location.href = url.toString();
        }

        // State-District mapping for India (from complete_profile.js)
        const stateDistrictMapping = {
            "Andhra Pradesh": [
                "Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", 
                "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", 
                "YSR Kadapa"
            ],
            "Arunachal Pradesh": [
                "Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", 
                "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", 
                "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", 
                "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", 
                "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
            ],
            "Assam": [
                "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", 
                "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", 
                "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", 
                "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", 
                "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", 
                "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"
            ],
            "Bihar": [
                "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", 
                "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", 
                "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", 
                "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", 
                "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", 
                "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", 
                "Siwan", "Supaul", "Vaishali", "West Champaran"
            ],
            "Chhattisgarh": [
                "Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", 
                "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir Champa", 
                "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", 
                "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", 
                "Sukma", "Surajpur", "Surguja"
            ],
            "Goa": [
                "North Goa", "South Goa"
            ],
            "Gujarat": [
                "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", 
                "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", 
                "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", 
                "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", 
                "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", 
                "Tapi", "Vadodara", "Valsad"
            ],
            "Haryana": [
                "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", 
                "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", 
                "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", 
                "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"
            ],
            "Himachal Pradesh": [
                "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", 
                "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
            ],
            "Jharkhand": [
                "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", 
                "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", 
                "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", 
                "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", 
                "West Singhbhum"
            ],
            "Karnataka": [
                "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", 
                "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", 
                "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", 
                "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", 
                "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", 
                "Vijayapura", "Yadgir"
            ],
            "Kerala": [
                "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", 
                "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", 
                "Thiruvananthapuram", "Thrissur", "Wayanad"
            ],
            "Madhya Pradesh": [
                "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", 
                "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", 
                "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", 
                "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", 
                "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", 
                "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", 
                "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", 
                "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", 
                "Umaria", "Vidisha"
            ],
            "Maharashtra": [
                "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", 
                "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", 
                "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", 
                "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", 
                "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", 
                "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
            ],
            "Manipur": [
                "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", 
                "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", 
                "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"
            ],
            "Meghalaya": [
                "East Garo Hills", "East Jaintia Hills", "East Khasi Hills", 
                "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", 
                "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", 
                "West Khasi Hills"
            ],
            "Mizoram": [
                "Aizawl", "Champhai", "Hnahthial", "Kolasib", "Khawzawl", "Lawngtlai", 
                "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"
            ],
            "Nagaland": [
                "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", 
                "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"
            ],
            "Odisha": [
                "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", 
                "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", 
                "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", 
                "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", 
                "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", 
                "Subarnapur", "Sundargarh"
            ],
            "Punjab": [
                "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", 
                "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", 
                "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Nawanshahr", 
                "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"
            ],
            "Rajasthan": [
                "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", 
                "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", 
                "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", 
                "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", 
                "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", 
                "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"
            ],
            "Sikkim": [
                "East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"
            ],
            "Tamil Nadu": [
                "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", 
                "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", 
                "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", 
                "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", 
                "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", 
                "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", 
                "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", 
                "Vellore", "Viluppuram", "Virudhunagar"
            ],
            "Telangana": [
                "Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", 
                "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", 
                "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", 
                "Mancherial", "Medak", "Medchal Malkajgiri", "Mulugu", "Nagarkurnool", 
                "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", 
                "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", 
                "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
            ],
            "Tripura": [
                "Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", 
                "South Tripura", "Unakoti", "West Tripura"
            ],
            "Uttar Pradesh": [
                "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", 
                "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", 
                "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", 
                "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", 
                "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", 
                "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", 
                "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", 
                "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", 
                "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", 
                "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", 
                "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", 
                "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", 
                "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", 
                "Sultanpur", "Unnao", "Varanasi"
            ],
            "Uttarakhand": [
                "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
                "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
                "Udham Singh Nagar", "Uttarkashi"
            ],
            "West Bengal": [
                "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", 
                "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", 
                "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", 
                "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", 
                "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"
            ],
            "Andaman and Nicobar Islands": [
                "Nicobar", "North and Middle Andaman", "South Andaman"
            ],
            "Chandigarh": [
                "Chandigarh"
            ],
            "Dadra and Nagar Haveli and Daman and Diu": [
                "Dadra and Nagar Haveli", "Daman", "Diu"
            ],
            "Delhi": [
                "Central Delhi", "East Delhi", "New Delhi", "North Delhi", 
                "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", 
                "South East Delhi", "South West Delhi", "West Delhi"
            ],
            "Jammu and Kashmir": [
                "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", 
                "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", 
                "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", 
                "Srinagar", "Udhampur"
            ],
            "Ladakh": [
                "Kargil", "Leh"
            ],
            "Lakshadweep": [
                "Lakshadweep"
            ],
            "Puducherry": [
                "Karaikal", "Mahe", "Puducherry", "Yanam"
            ]
        };

        // State-District functionality for donor form
        function setupDonorLocationFields() {
            // Try both possible IDs for add donor form
            const donorStateSelect = document.getElementById('add-state') || document.getElementById('donor-state');
            const donorDistrictSelect = document.getElementById('add-district') || document.getElementById('donor-district');
            const donorCityInput = document.getElementById('add-city') || document.getElementById('donor-city');
            
            if (donorStateSelect && donorDistrictSelect) {
                // Remove any existing event listeners to prevent duplicates
                donorStateSelect.removeEventListener('change', handleStateChange);
                
                // Add the event listener
                donorStateSelect.addEventListener('change', handleStateChange);
                
                function handleStateChange() {
                    const selectedState = this.value;
                    
                    // Clear district dropdown
                    donorDistrictSelect.innerHTML = '<option value="">Select district</option>';
                    
                    if (selectedState && stateDistrictMapping[selectedState]) {
                        // Enable district dropdown
                        donorDistrictSelect.disabled = false;
                        
                        // Populate districts
                        stateDistrictMapping[selectedState].forEach(function(district) {
                            const option = document.createElement('option');
                            option.value = district;
                            option.textContent = district;
                            donorDistrictSelect.appendChild(option);
                        });
                    } else {
                        // Disable district dropdown if no state selected
                        donorDistrictSelect.disabled = true;
                        donorDistrictSelect.innerHTML = '<option value="">First select a state</option>';
                    }
                    
                    // Clear city input when state changes
                    if (donorCityInput) {
                        donorCityInput.value = '';
                    }
                }
            }
        }

        // State-District functionality for edit donor form
        function setupEditDonorLocationFields(donor) {
            const editDonorStateSelect = document.getElementById('edit-donor-state');
            const editDonorDistrictSelect = document.getElementById('edit-donor-district');
            const editDonorCityInput = document.getElementById('edit-donor-city');
            
            if (editDonorStateSelect && editDonorDistrictSelect) {
                // Remove any existing event listeners to prevent duplicates
                editDonorStateSelect.removeEventListener('change', handleEditStateChange);
                
                // Add the event listener
                editDonorStateSelect.addEventListener('change', handleEditStateChange);
                
                function handleEditStateChange() {
                    const selectedState = this.value;
                    
                    // Clear district dropdown
                    editDonorDistrictSelect.innerHTML = '<option value="">Select district</option>';
                    
                    if (selectedState && stateDistrictMapping[selectedState]) {
                        // Enable district dropdown
                        editDonorDistrictSelect.disabled = false;
                        
                        // Populate districts
                        stateDistrictMapping[selectedState].forEach(function(district) {
                            const option = document.createElement('option');
                            option.value = district;
                            option.textContent = district;
                            if (donor.district === district) {
                                option.selected = true;
                            }
                            editDonorDistrictSelect.appendChild(option);
                        });
                    } else {
                        // Disable district dropdown if no state selected
                        editDonorDistrictSelect.disabled = true;
                        editDonorDistrictSelect.innerHTML = '<option value="">First select a state</option>';
                    }
                }
                
                // Trigger the change event to populate districts if state is already selected
                if (donor.state) {
                    editDonorStateSelect.value = donor.state;
                    handleEditStateChange.call(editDonorStateSelect);
                }
            }
        }

        // Filter functionality
        function applyFilters() {
            const search = document.getElementById('searchInput').value;
            const bloodType = document.getElementById('bloodTypeFilter').value;
            const availability = document.getElementById('availabilityFilter').value;
            
            const url = new URL(window.location);
            if (search) url.searchParams.set('search', search);
            else url.searchParams.delete('search');
            
            if (bloodType) url.searchParams.set('blood_type', bloodType);
            else url.searchParams.delete('blood_type');
            
            if (availability) url.searchParams.set('availability', availability);
            else url.searchParams.delete('availability');
            
            window.location.href = url.toString();
        }

        // Add event listeners for filters
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchInput');
            const bloodTypeFilter = document.getElementById('bloodTypeFilter');
            const availabilityFilter = document.getElementById('availabilityFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', debounce(applyFilters, 500));
            }
            if (bloodTypeFilter) {
                bloodTypeFilter.addEventListener('change', applyFilters);
            }
            if (availabilityFilter) {
                availabilityFilter.addEventListener('change', applyFilters);
            }
            
            // Setup location fields for donor form
            setupDonorLocationFields();
        });

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Validation functions for add donor form
        let addDonorTouched = {};

        function setError(name, message) {
            const box = document.querySelector(`[data-error="${name}"]`);
            if (box) {
                box.textContent = message || '';
            }
        }

        function validateField(fieldName) {
            addDonorTouched[fieldName] = true;
            const element = document.getElementById(`add-${fieldName}`);
            if (!element) return;

            const value = element.value.trim();
            let errorMessage = '';

            switch (fieldName) {
                case 'full_name':
                    if (!value) {
                        errorMessage = 'Please enter your full name';
                    } else if (value.length < 2) {
                        errorMessage = 'Name must be at least 2 characters';
                    }
                    break;

                case 'email':
                    if (!value) {
                        errorMessage = 'Please enter your email address';
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;

                case 'phone':
                    if (!value) {
                        errorMessage = 'Please enter your phone number';
                    } else if (!/^[0-9]{10}$/.test(value)) {
                        errorMessage = 'Phone number must be exactly 10 digits';
                    }
                    break;

                case 'dob':
                    if (!value) {
                        errorMessage = 'Please enter your date of birth';
                    } else {
                        const birth = new Date(value);
                        const today = new Date();
                        const age = today.getFullYear() - birth.getFullYear();
                        if (age < 18 || age > 65) {
                            errorMessage = 'Age must be between 18 and 65 years';
                        }
                    }
                    break;

                case 'gender':
                    if (!value) {
                        errorMessage = 'Please select your gender';
                    } else if (!['male', 'female', 'other'].includes(value)) {
                        errorMessage = 'Please select a valid gender';
                    }
                    break;

                case 'blood_type':
                    if (!value) {
                        errorMessage = 'Please select your blood type';
                    }
                    break;

                case 'state':
                    if (!value) {
                        errorMessage = 'Please select your state';
                    }
                    break;

                case 'district':
                    if (!value) {
                        errorMessage = 'Please select your district';
                    }
                    break;

                case 'city':
                    if (!value) {
                        errorMessage = 'Please enter your city';
                    } else if (value.length < 2) {
                        errorMessage = 'City name must be at least 2 characters';
                    }
                    break;
            }

            setError(fieldName, errorMessage);
        }

        function validateAddDonorForm() {
            // Mark all fields as touched
            const requiredFields = ['full_name', 'email', 'phone', 'dob', 'gender', 'blood_type', 'state', 'district', 'city'];
            requiredFields.forEach(field => {
                addDonorTouched[field] = true;
                validateField(field);
            });

            // Check if all validations pass
            const errorElements = document.querySelectorAll('[data-error]');
            let hasErrors = false;
            
            errorElements.forEach(element => {
                if (element.textContent.trim() !== '') {
                    hasErrors = true;
                }
            });

            if (hasErrors) {
                // Scroll to first error
                const firstError = document.querySelector('[data-error]:not(:empty)');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return false;
            }

            return true;
        }

        // Blood Type Details Function
        function showBloodTypeDetails(bloodType) {
            const donorsWithBloodType = donors.filter(donor => donor.blood_type === bloodType);
            
            if (donorsWithBloodType.length === 0) {
                const content = `
                    <div class="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-tint text-gray-400 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">No Donors Found</h3>
                        <p class="text-gray-600">There are no donors with blood type <span class="font-semibold text-red-600">${bloodType}</span> registered yet.</p>
                    </div>
                `;
                showDetailsPanel(`🩸 ${bloodType} Blood Type Details`, content);
                return;
            }

            const content = `
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    <div class="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200 mb-6">
                        <div class="flex items-center justify-center">
                            <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4">
                                <i class="fas fa-tint text-white"></i>
                            </div>
                            <div class="text-center">
                                <h3 class="text-xl font-bold text-gray-800">${bloodType}</h3>
                                <p class="text-gray-600">${donorsWithBloodType.length} donor${donorsWithBloodType.length !== 1 ? 's' : ''} registered</p>
                            </div>
                        </div>
                    </div>
                    ${donorsWithBloodType.map((donor, index) => `
                        <div class="detail-item" onclick="showDonorDetails(${donor.id})">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center text-red-600 font-bold text-lg mr-4">
                                        ${(donor.full_name || 'D').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-900 text-lg">${donor.full_name || 'N/A'}</h4>
                                        <p class="text-sm text-gray-600 flex items-center">
                                            <i class="fas fa-envelope mr-1"></i>
                                            ${donor.email || 'N/A'}
                                        </p>
                                        <p class="text-xs text-gray-500">${donor.city || 'N/A'}, ${donor.state || 'N/A'}</p>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <span class="status-badge ${donor.availability === 'Available' ? 'status-approved' : 'status-rejected'}">
                                        ${donor.availability || 'Available'}
                                    </span>
                                    <span class="status-badge status-pending">
                                        ${donor.blood_type || 'N/A'}
                                    </span>
                                    <i class="fas fa-arrow-right text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            showDetailsPanel(`🩸 ${bloodType} Blood Type Details`, content);
        }
    </script>
</body>
</html>