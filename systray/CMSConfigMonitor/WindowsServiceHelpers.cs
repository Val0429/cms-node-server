using System;
using System.ServiceProcess;

namespace CMSConfigMonitor
{
    public static class WindowsServiceHelpers
    {
        public static ServiceControllerStatus GetServiceStatus(string serviceName)
        {
            using (var service = new ServiceController(serviceName))
            {
                return service.Status;
            }
        }
        
        public static void RestartService(string serviceName, int timeoutMilliseconds)
        {
            using (var service = new ServiceController(serviceName))
            {

                int millisec1 = Environment.TickCount;
                TimeSpan timeout = TimeSpan.FromMilliseconds(timeoutMilliseconds);

                service.Stop();
                service.WaitForStatus(ServiceControllerStatus.Stopped, timeout);

                // count the rest of the timeout
                int millisec2 = Environment.TickCount;
                timeout = TimeSpan.FromMilliseconds(timeoutMilliseconds - (millisec2 - millisec1));

                service.Start();
                service.WaitForStatus(ServiceControllerStatus.Running, timeout);
            }

        }
        public static void StartService(string serviceName, int timeoutMilliseconds)
        {
            using (var service = new ServiceController(serviceName))
            {

                TimeSpan timeout = TimeSpan.FromMilliseconds(timeoutMilliseconds);

                service.Start();
                service.WaitForStatus(ServiceControllerStatus.Running, timeout);
            }

        }
        public static void StopService(string serviceName, int timeoutMilliseconds)
        {
            using (var service = new ServiceController(serviceName))
            {
                TimeSpan timeout = TimeSpan.FromMilliseconds(timeoutMilliseconds);
                service.Stop();
                service.WaitForStatus(ServiceControllerStatus.Stopped, timeout);
            }
        }
    }
}
