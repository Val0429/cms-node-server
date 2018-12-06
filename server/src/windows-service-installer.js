var Service = require('node-windows').Service;
var program = require('commander');

// Create a new service object 
var svc = new Service({
    name: 'CMS3.0 Config Server',
    description: 'Provides config server and tool to adjust settings.',
    script: require('path').join(__dirname, 'app.js')
    //   script: 'C:\\Users\\Desmond.Hung\\Documents\\Projects\\isap-cms\\server\\app.js'
});

program
    .version('0.0.1')
    .option('-i, --install', 'Add install')
    .option('-u, --uninstall', 'Add uninstall')
    .parse(process.argv);

if (program.install) {
    console.log('Start to install CMS3 Service.');
    svc.on('install', function () {
        console.log('Install complete');
        //svc.start();
        //console.log('CMS3 Service is running now.');
    });

    svc.install();
} else if (program.uninstall) {
    console.log('Start to uninstall CMS3 Service.');
    svc.on('uninstall', function () {
        console.log('Uninstall complete.');
        console.log('The service exists: ', svc.exists);
    });

    svc.uninstall();
} else {
    console.log('Please run this installer with command parameter as below.');
    console.log('Install: node windows-service-installer.js -i (or --install)');
    console.log('Uninstall: node windows-service-installer.js -u (or --uninstall)');
}