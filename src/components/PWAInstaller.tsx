import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Smartphone,
  Monitor,
  Check,
  X,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installationSupported, setInstallationSupported] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
      }
    };

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallationSupported(true);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check installation status
    checkIfInstalled();

    // Add event listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Service Worker registered successfully
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error);
        });
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        // User accepted the install prompt
        setIsInstalled(true);
      } else {
        // User dismissed the install prompt
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setInstallationSupported(false);
    } catch (error) {
      console.error("❌ Installation failed:", error);
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Check className="h-4 w-4" />
        <span>App installed successfully!</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Installation Banner */}
      {installationSupported && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    Install 4Front Trackity-doo
                  </p>
                  <p className="text-sm text-orange-600">
                    Get faster access and offline capabilities
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInstallationSupported(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PWA Information Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Info className="h-4 w-4 mr-2" />
            About Installing the App
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-orange-600" />
              Install 4Front Trackity-doo
            </DialogTitle>
            <DialogDescription>
              Transform your browser experience into a native app
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Benefits */}
            <div>
              <h4 className="font-medium mb-2">Benefits of Installing:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Faster loading times
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Works offline (view data, limited functionality)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Desktop/mobile app experience
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  No app store required
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Automatic updates
                </li>
              </ul>
            </div>

            {/* Device Support */}
            <div>
              <h4 className="font-medium mb-2">Supported Platforms:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Desktop (Chrome, Edge)
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Mobile (Chrome, Safari)
                </Badge>
              </div>
            </div>

            {/* Installation Instructions */}
            <div>
              <h4 className="font-medium mb-2">How to Install:</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <div>
                  <strong>Desktop:</strong>
                  <ol className="list-decimal list-inside ml-2 mt-1">
                    <li>
                      Look for the install icon in your browser's address bar
                    </li>
                    <li>Click "Install" when prompted</li>
                    <li>The app will appear in your applications folder</li>
                  </ol>
                </div>
                <div>
                  <strong>Mobile:</strong>
                  <ol className="list-decimal list-inside ml-2 mt-1">
                    <li>Tap the share button in your browser</li>
                    <li>Select "Add to Home Screen"</li>
                    <li>Confirm the installation</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Installation Support:</span>
                <Badge
                  variant={installationSupported ? "default" : "secondary"}
                >
                  {installationSupported ? "Available" : "Not Available"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Network Status:</span>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <Badge variant={isOnline ? "default" : "destructive"}>
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            {installationSupported ? (
              <Button onClick={handleInstallClick} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Install Now
              </Button>
            ) : (
              <div className="w-full text-center text-sm text-gray-500">
                Installation will be available when supported by your browser
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
