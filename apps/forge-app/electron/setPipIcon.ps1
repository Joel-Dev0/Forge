param(
    [string]$IcoPath,
    [int]$TargetPid
)

if (-not (Test-Path $IcoPath)) { exit }

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinIconSetter {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr LoadImage(IntPtr hinst, string lpszName, uint uType, int cxDesired, int cyDesired, uint fuLoad);

    public static int Apply(string icoPath, int targetPid) {
        IntPtr hIconBig = LoadImage(IntPtr.Zero, icoPath, 1, 32, 32, 0x0010);
        IntPtr hIconSmall = LoadImage(IntPtr.Zero, icoPath, 1, 16, 16, 0x0010);
        if (hIconBig == IntPtr.Zero && hIconSmall == IntPtr.Zero) return 0;

        int count = 0;
        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == targetPid) {
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title.IndexOf("Picture in picture", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Picture-in-picture", StringComparison.OrdinalIgnoreCase) >= 0) {
                    if (hIconSmall != IntPtr.Zero) SendMessage(hWnd, 0x0080, (IntPtr)0, hIconSmall);
                    if (hIconBig != IntPtr.Zero) SendMessage(hWnd, 0x0080, (IntPtr)1, hIconBig);
                    count++;
                }
            }
            return true;
        }, IntPtr.Zero);
        return count;
    }
}
"@ -ErrorAction SilentlyContinue

[WinIconSetter]::Apply($IcoPath, $TargetPid)
