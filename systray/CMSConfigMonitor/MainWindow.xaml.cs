using System;
using System.Drawing;
using System.IO;
using System.ServiceProcess;
using System.Windows;
using System.Windows.Forms;

namespace CMSConfigMonitor
{

    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private NotifyIcon nIcon = new NotifyIcon();
        private bool cancelExit = true;
        private ContextMenu ctxMenu;
        private const string ServiceName = "cms30configserver.exe";
        private const int TimeoutMilliseconds = 30000;
        private readonly Timer MonitorService;
        public MainWindow()
        {
            InitializeComponent();
            MonitorService = new Timer
            {
                Interval = 1000
            };
            MonitorService.Tick += MonitorService_Tick;
            MonitorService.Start();
            Title = "CMS Config Tool Service Monitor";
            InitNotifyIcon();
            Hide();
            var status = UpdateStatus();
            ToogleContextMenuVisibility(status);
            btToggleService.Content = status != ServiceControllerStatus.Running ? "Start" : "Stop";
#if DEBUG
            WindowState = WindowState.Normal;
            Show();
#endif
        }

        private void MonitorService_Tick(object sender, EventArgs e)
        {
            try
            {
                //in case of config tool uninstallation 
                var status = WindowsServiceHelpers.GetServiceStatus(ServiceName);
                Console.WriteLine(status.ToString());                
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                MonitorService.Stop();
                //kill application;
                cancelExit = false;
                Close();
            }
        }

        private void InitNotifyIcon()
        {
            nIcon.Visible = true;
            Stream iconStream = System.Windows.Application.GetResourceStream(new Uri("pack://application:,,,/CMSConfigMonitor;component/icon.ico")).Stream;
            nIcon.Icon = new Icon(iconStream);

            ctxMenu = new ContextMenu();
            ShowToolTip();            

            ctxMenu.MenuItems.Add("Start");
            ctxMenu.MenuItems.Add("Stop");
            ctxMenu.MenuItems.Add("Exit");
            ctxMenu.MenuItems[0].Click += ToggleService;
            ctxMenu.MenuItems[1].Click += ToggleService;
            ctxMenu.MenuItems[2].Click += Exit_Click;

            nIcon.ContextMenu = ctxMenu;
            nIcon.MouseDown += NIcon_MouseDown;
            
        }

        private void NIcon_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Right) return;

            var status = WindowsServiceHelpers.GetServiceStatus(ServiceName);

            ToogleContextMenuVisibility(status);

        }

        private void ToogleContextMenuVisibility(ServiceControllerStatus status)
        {
            ctxMenu.MenuItems[0].Visible = status != ServiceControllerStatus.Running;
            ctxMenu.MenuItems[1].Visible = !ctxMenu.MenuItems[0].Visible;
        }

        private ServiceControllerStatus UpdateStatus()
        {
            try
            {
                var status = WindowsServiceHelpers.GetServiceStatus(ServiceName);
                lServiceStatus.Content = status.ToString();
                return status;
            }catch(Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return ServiceControllerStatus.Stopped;
            }
        }

        private void ShowToolTip()
        {
            nIcon.ShowBalloonTip(5000, Title, "Show service status here", ToolTipIcon.Info);
        }

        private void Exit_Click(object sender, EventArgs e)
        {
            cancelExit = false;
            Close();
        }


        private void Window_StateChanged(object sender, EventArgs e)
        {
            if (WindowState == WindowState.Minimized)
            {
                Hide();               
            }
            UpdateStatus();
        }

        private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            e.Cancel = cancelExit;
            WindowState = WindowState.Minimized;
            ShowToolTip();
        }

        private void Window_KeyUp(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if(e.Key == System.Windows.Input.Key.F5)
            {
                UpdateStatus();
            }
        }

        private void BtToggleService_Click(object sender, RoutedEventArgs e)
        {
            ToggleService(sender, null);
        }

        private void ToggleService(object sender, EventArgs e)
        {
            try
            {
                if (UpdateStatus() != ServiceControllerStatus.Running)
                {
                    WindowsServiceHelpers.StartService(ServiceName, TimeoutMilliseconds);
                }
                else
                {
                    WindowsServiceHelpers.StopService(ServiceName, TimeoutMilliseconds);
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(ex.Message);
                Console.WriteLine(ex.ToString());
            }
            finally
            {                
                btToggleService.Content = UpdateStatus() != ServiceControllerStatus.Running ? "Start" : "Stop";
                System.Windows.MessageBox.Show((string)btToggleService.Content == "Start" ? "Service has been stopped" : "Service has been started", Title);
            }
        }
    }
}
