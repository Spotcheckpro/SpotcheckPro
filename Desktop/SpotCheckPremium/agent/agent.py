# SpotCheckPremium Agent (demo)
# Usage: python agent.py --student "Student Name" --server "http://localhost:3001"
import time, argparse, platform, random, json, requests, os

def get_active_window_windows():
    try:
        import win32gui
        wnd = win32gui.GetForegroundWindow()
        title = win32gui.GetWindowText(wnd)
        pid = win32gui.GetWindowThreadProcessId(wnd)
        return title
    except Exception as e:
        return None

def simulate_activity():
    APPS = ["Chrome - YouTube", "Word - Homework", "Zoom Meeting", "Discord - chat", "Calculator"]
    return random.choice(APPS)

def report(server, student):
    activity = {}
    if platform.system() == "Windows":
        title = get_active_window_windows()
        if title:
            activity["process"] = "unknown"
            activity["windowTitle"] = title
        else:
            activity["windowTitle"] = simulate_activity()
    else:
        activity["windowTitle"] = simulate_activity()
    activity["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    activity["studentName"] = student
    # Heuristic: mark off-task if window contains "YouTube" or "Discord"
    if "YouTube" in activity.get("windowTitle","") or "Discord" in activity.get("windowTitle",""):
        activity["type"] = "off-task"
    else:
        activity["type"] = "on-task"
    try:
        r = requests.post(f"{server}/api/violation", json=activity, timeout=5)
        print("Reported:", activity, "->", r.status_code)
    except Exception as e:
        print("Error reporting:", e)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--student", required=True)
    parser.add_argument("--server", default="http://localhost:3001")
    parser.add_argument("--interval", type=int, default=12)
    args = parser.parse_args()
    print("Agent starting:", args.student, "->", args.server)
    # simple loop
    while True:
        report(args.server, args.student)
        time.sleep(args.interval)
