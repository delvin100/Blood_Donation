<?php
session_start();
require_once __DIR__ . '/db.php';

// Get database connection
try {
    $pdo = get_pdo();
} catch (Exception $e) {
    die('Database connection failed: ' . $e->getMessage());
}

// If already logged in, go to dashboard
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: admin_dashboard.php');
    exit;
}

$error = '';
$success = '';

// -----------------------------
// Handle credential update (from Settings modal)
// -----------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_credentials'])) {
    $currentPassword = trim($_POST['current_password'] ?? '');
    $newUsername = trim($_POST['new_username'] ?? '');
    $newPassword = trim($_POST['new_password'] ?? '');
    $confirmPassword = trim($_POST['confirm_password'] ?? '');

    if ($currentPassword === '') {
        $error = 'Current password is required to change settings.';
    } else {
        // Get current admin credentials from database
        try {
            $stmt = $pdo->prepare("SELECT * FROM admin LIMIT 1");
            $stmt->execute();
            $adminData = $stmt->fetch();
            
            if (!$adminData || !password_verify($currentPassword, $adminData['password_hash'])) {
                $error = 'Current password is incorrect.';
            } else {
                // Prepare updates
                $updatedUsername = $adminData['username'];
                $updatedPasswordHash = $adminData['password_hash'];

                if ($newUsername !== '') {
                    if (strlen($newUsername) < 3) {
                        $error = 'Username must be at least 3 characters.';
                    } else {
                        $updatedUsername = $newUsername;
                    }
                }

                if (!$error && $newPassword !== '') {
                    if (strlen($newPassword) < 6) {
                        $error = 'New password must be at least 6 characters.';
                    } elseif ($newPassword !== $confirmPassword) {
                        $error = 'New password and confirm password do not match.';
                    } else {
                        $updatedPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                    }
                }

                if (!$error) {
                    // Update database
                    $updateStmt = $pdo->prepare("UPDATE admin SET username = ?, password_hash = ? WHERE id = ?");
                    $updateStmt->execute([$updatedUsername, $updatedPasswordHash, $adminData['id']]);
                    $success = 'Admin credentials updated successfully.';
                }
            }
        } catch (Exception $e) {
            $error = 'Database error: ' . $e->getMessage();
        }
    }
}

// -----------------------------
// Handle login
// -----------------------------
// Trigger login on any POST that is not the settings update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['update_credentials'])) {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = 'Please enter both username and password.';
    } else {
        try {
            // Check credentials against database
            $stmt = $pdo->prepare("SELECT * FROM admin WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $adminData = $stmt->fetch();
            
            // Debug logging (remove in production)
            error_log("Admin login attempt - Username: $username");
            error_log("Admin data found: " . ($adminData ? 'YES' : 'NO'));
            if ($adminData) {
                error_log("Password hash from DB: " . $adminData['password_hash']);
                error_log("Password verify result: " . (password_verify($password, $adminData['password_hash']) ? 'PASS' : 'FAIL'));
            }
            
            if ($adminData && password_verify($password, $adminData['password_hash'])) {
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_username'] = $username;
                $_SESSION['admin_login_time'] = time();

                $redirectTo = 'admin_dashboard.php';
                if (!headers_sent()) {
                    header("Location: $redirectTo");
                    exit;
                } else {
                    echo "<script>window.location.href='" . $redirectTo . "';</script>";
                    exit;
                }
            } else {
                $error = 'Invalid username or password. Please try again.';
            }
        } catch (Exception $e) {
            $error = 'Database error: ' . $e->getMessage();
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Blood Donation System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" integrity="sha512-..." crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        .wave-bg { background: linear-gradient(135deg, #fef2f2 0%, #ffffff 25%, #fef2f2 50%, #ffffff 75%, #fef2f2 100%); background-size: 400% 400%; animation: waveMove 8s ease-in-out infinite; }
        @keyframes waveMove { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%}}
        .wave-pattern { position:absolute; inset:0; background-image:
            radial-gradient(circle at 20% 20%, rgba(239,68,68,.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(239,68,68,.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(239,68,68,.06) 0%, transparent 50%),
            radial-gradient(circle at 10% 70%, rgba(239,68,68,.05) 0%, transparent 30%),
            radial-gradient(circle at 90% 30%, rgba(239,68,68,.04) 0%, transparent 25%),
            radial-gradient(circle at 60% 10%, rgba(239,68,68,.03) 0%, transparent 20%),
            radial-gradient(circle at 30% 90%, rgba(239,68,68,.02) 0%, transparent 15%);
            animation: waveFloat 12s ease-in-out infinite; }
        .light-drops { position:absolute; inset:0; background-image:
            radial-gradient(circle at 15% 25%, rgba(239,68,68,.08) 0%, transparent 40%),
            radial-gradient(circle at 85% 75%, rgba(239,68,68,.06) 0%, transparent 35%),
            radial-gradient(circle at 45% 85%, rgba(239,68,68,.04) 0%, transparent 30%),
            radial-gradient(circle at 75% 15%, rgba(239,68,68,.03) 0%, transparent 25%);
            animation: dropFloat 8s ease-in-out infinite; }
        @keyframes dropFloat { 0%,100%{ transform:translateY(0) scale(1); opacity:.6 } 50%{ transform:translateY(-5px) scale(1.1); opacity:.8 } }
        @keyframes waveFloat { 0%,100%{transform:translateY(0) rotate(0)} 33%{transform:translateY(-10px) rotate(1deg)} 66%{transform:translateY(5px) rotate(-1deg)} }
        .glass-card { background: rgba(255,255,255,.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,.2); box-shadow: 0 25px 45px rgba(0,0,0,.1); }
        .modern-btn { background: linear-gradient(135deg,#ef4444 0%,#dc2626 100%); box-shadow: 0 10px 25px rgba(239,68,68,.3); transition: all .3s ease; }
        .modern-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(239,68,68,.4); }
        .floating { animation: floating 6s ease-in-out infinite; }
        @keyframes floating { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(239,68,68,.3)} 50%{box-shadow:0 0 30px rgba(239,68,68,.6)} }
        .fade-in { animation: fadeIn 1s ease-out; } @keyframes fadeIn { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        .feature-icon { background: linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%); border:2px solid rgba(239,68,68,.1); cursor:pointer; transition: all .3s ease; }
        .feature-icon:hover { background: linear-gradient(135deg,#fee2e2 0%,#fecaca 100%); border:2px solid rgba(239,68,68,.3); transform: translateY(-3px); box-shadow: 0 10px 25px rgba(239,68,68,.2); }
        .feature-icon:active { transform: translateY(-1px); }
        .settings-modal { display:none; position:fixed; inset:0; background: rgba(0,0,0,.5); z-index:1000; backdrop-filter: blur(5px); }
        .settings-content { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; border-radius:20px; padding:30px; max-width:520px; width:90%; box-shadow:0 25px 50px rgba(0,0,0,.3); }
        .settings-close { position:absolute; top:15px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#666; }
        .loading { opacity:.7; pointer-events:none; }
        .spinner { display:inline-block; width:20px; height:20px; border:3px solid rgba(255,255,255,.3); border-radius:50%; border-top-color:#fff; animation: spin 1s ease-in-out infinite; }
        @keyframes spin { to{ transform: rotate(360deg) } }
        /* Info Modal (white box for messages) */
        .info-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1001; backdrop-filter: blur(4px); }
        .info-content { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:92%; max-width:520px; background:#fff; border-radius:18px; padding:24px; box-shadow:0 25px 50px rgba(0,0,0,.25); }
        .info-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .info-title { font-weight:700; color:#1f2937; }
        .info-close { background:none; border:none; color:#6b7280; font-size:20px; cursor:pointer; }
        /* Ensure icon visibility */
        .input-icon {
            position: absolute;
            top: 50%;
            left: 0.75rem;
            transform: translateY(-50%);
            color: #6b7280;
            font-size: 1rem;
            z-index: 10;
        }
    </style>
</head>
<body class="wave-bg h-screen relative overflow-hidden">
    <div class="wave-pattern"></div>
    <div class="light-drops"></div>

    <div class="relative z-10 h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div class="w-full max-w-lg fade-in">
            <div class="glass-card rounded-3xl p-8 shadow-2xl border border-red-100">
                <!-- Header Section with Logo and Title -->
                <div class="text-center mb-8">
                    <div class="relative mb-6">
                        <div class="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg floating pulse-glow">
                            <i class="fas fa-shield-alt text-white text-2xl"></i>
                        </div>
                        <div class="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-white text-xs"></i>
                        </div>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
                    <p class="text-gray-600">Secure access to blood donation management</p>
                </div>

                <!-- Alert Messages -->
                <?php if ($error): ?>
                <div class="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle mr-3 text-red-500"></i>
                        <span><?php echo htmlspecialchars($error); ?></span>
                    </div>
                </div>
                <?php endif; ?>
                <?php if ($success): ?>
                <div class="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg mb-6">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle mr-3 text-green-500"></i>
                        <span><?php echo htmlspecialchars($success); ?></span>
                    </div>
                </div>
                <?php endif; ?>

                <!-- Login Form -->
                <form method="POST" action="" class="space-y-6">
                    <div class="space-y-4">
                        <div class="relative mb-4">
                            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <i class="fa-solid fa-circle-user text-red-500"></i>
                            </div>
                            <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>" required 
                                   class="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:border-gray-300 transition-all duration-200 bg-white text-gray-700 placeholder-gray-500" 
                                   placeholder="Enter your username">
                        </div>
                        
                        <div class="relative">
                            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <i class="fa-solid fa-lock text-red-500"></i>
                            </div>
                            <input type="password" id="password" name="password" required 
                                   class="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-full focus:outline-none focus:border-gray-300 transition-all duration-200 bg-white text-gray-700 placeholder-gray-500" 
                                   placeholder="Enter your password">
                            <div class="absolute inset-y-0 right-4 flex items-center">
                                <button type="button" onclick="togglePasswordVisibility()" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                                    <i id="passwordToggleIcon" class="fa-solid fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        
                        <script>
                            function togglePasswordVisibility() {
                                const passwordInput = document.getElementById('password');
                                const passwordToggleIcon = document.getElementById('passwordToggleIcon');
                                
                                if (passwordInput.type === 'password') {
                                    passwordInput.type = 'text';
                                    passwordToggleIcon.classList.remove('fa-eye');
                                    passwordToggleIcon.classList.add('fa-eye-slash');
                                } else {
                                    passwordInput.type = 'password';
                                    passwordToggleIcon.classList.remove('fa-eye-slash');
                                    passwordToggleIcon.classList.add('fa-eye');
                                }
                            }
                        </script>
                    </div>

                    <button type="submit" name="login_submit" class="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                        <i class="fas fa-sign-in-alt mr-2"></i>Access Dashboard
                    </button>
                </form>

                <!-- Footer Actions -->
                <div class="mt-8 flex items-center justify-between">
                    <a href="index.php" class="inline-flex items-center text-gray-600 hover:text-red-600 transition-colors group">
                        <i class="fas fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
                        <span>Back to Home</span>
                    </a>
                    
                    <button onclick="showSettings()" class="inline-flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl transition-all duration-200 hover:shadow-md" title="Admin Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Settings Modal -->
        <div id="settingsModal" class="settings-modal">
            <div class="settings-content">
                <button class="settings-close" onclick="closeSettings()">&times;</button>
                <h3 class="text-xl font-bold text-gray-900 mb-4">Admin Settings</h3>

                <form method="POST" class="space-y-4">
                    <input type="hidden" name="update_credentials" value="1">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Current Password <span class="text-red-600">*</span></label>
                        <input type="password" name="current_password" placeholder="Enter current password" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">New Username (optional)</label>
                        <input type="text" name="new_username" placeholder="Enter new username" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input type="password" name="new_password" placeholder="Min 6 characters" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input type="password" name="confirm_password" placeholder="Re-enter new password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                        </div>
                    </div>
                    <div class="flex space-x-3 pt-2">
                        <button type="submit" class="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">Save Changes</button>
                        <button type="button" class="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors" onclick="closeSettings()">Close</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Info Modal (replaces browser alerts) -->
        <div id="infoModal" class="info-modal">
            <div class="info-content">
                <div class="info-header">
                    <h4 id="infoTitle" class="info-title">Information</h4>
                    <button class="info-close" onclick="closeInfo()">&times;</button>
                </div>
                <div id="infoBody" class="text-gray-700 text-sm leading-relaxed"></div>
                <div class="mt-6 text-right"><button class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700" onclick="closeInfo()">OK</button></div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form[action=""]');
            const submitBtn = document.querySelector('button[type="submit"][name="login_submit"]');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput) usernameInput.focus();
            form.addEventListener('submit', function(e) {
                const u = usernameInput.value.trim();
                const p = passwordInput.value.trim();
                if (!u || !p) { e.preventDefault(); showInfo('Missing Information', '<ul class="list-disc pl-5"><li>Please enter both username and password.</li></ul>'); return false; }
                // Show loading state for 0.5 seconds before submitting
                e.preventDefault();
                submitBtn.innerHTML = '<div class="spinner"></div> Logging in...';
                submitBtn.disabled = true;
                form.classList.add('loading');
                setTimeout(function() { form.submit(); }, 500);
                return false;
            });
            [usernameInput,passwordInput].forEach(i=> i&&i.addEventListener('input',()=>{ const err=document.querySelector('.bg-red-50'); if(err) err.style.display='none'; }));
            passwordInput.addEventListener('keypress', function(e){ if(e.key==='Enter'){ form.submit(); }});
        });

        function showInfo(title, html){ 
            document.getElementById('infoTitle').textContent = title; 
            document.getElementById('infoBody').innerHTML = html; 
            document.getElementById('infoModal').style.display='block'; 
        }
        function closeInfo(){ 
            document.getElementById('infoModal').style.display='none'; 
        }

        function showSettings(){ document.getElementById('settingsModal').style.display='block'; }
        function closeSettings(){ document.getElementById('settingsModal').style.display='none'; }
        window.onclick = function(e){ const s=document.getElementById('settingsModal'); const i=document.getElementById('infoModal'); if(e.target===s) s.style.display='none'; if(e.target===i) i.style.display='none'; }
    </script>
</body>
</html>