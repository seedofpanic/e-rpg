const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');

// Function to start the Flask app
function startApp() {
  console.log('Starting Flask application...');
  
  // Run the app in a separate process
  // Adjust the command based on how your app is normally started
  const appProcess = spawn('python', ['app.py'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    shell: true
  });

  // Log output from the app
  appProcess.stdout.on('data', (data) => {
    console.log(`App output: ${data}`);
  });

  appProcess.stderr.on('data', (data) => {
    console.error(`App error: ${data}`);
  });

  // Return the process so we can kill it later
  return appProcess;
}

// Main function
async function main() {
  // Start the Flask app
  const appProcess = startApp();
  
  // Give the app some time to start
  console.log('Waiting for app to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // Run the tests
    console.log('Running Playwright tests...');
    execSync('npm test', { 
      cwd: __dirname,
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('Tests failed:', error);
  } finally {
    // Terminate the app
    console.log('Terminating app...');
    appProcess.kill();
  }
}

// Run the main function
main().catch(console.error); 