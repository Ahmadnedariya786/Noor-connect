import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Chrome, Smartphone } from "lucide-react";
import { Card } from "./ui/card";

export function InstallDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 ripple elevation-1">
          <Download className="w-4 h-4" />
          Install App
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Install Noor Connect</DialogTitle>
          <DialogDescription>
            Install our app on your device for the best experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Chrome/Edge on Android */}
          <Card className="p-4 elevation-1 border-0">
            <div className="flex items-start gap-3">
              <Chrome className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm">Chrome/Edge (Android)</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Tap the menu (⋮) in the top right</li>
                  <li>Select "Add to Home screen" or "Install app"</li>
                  <li>Tap "Add" or "Install" to confirm</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Safari on iOS */}
          <Card className="p-4 elevation-1 border-0">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm">Safari (iPhone/iPad)</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Tap the Share button (square with arrow)</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right corner</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Samsung Internet */}
          <Card className="p-4 elevation-1 border-0">
            <div className="flex items-start gap-3">
              <Chrome className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm">Samsung Internet</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Tap the menu (≡) at the bottom</li>
                  <li>Select "Add page to" → "Home screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Firefox */}
          <Card className="p-4 elevation-1 border-0">
            <div className="flex items-start gap-3">
              <Chrome className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm">Firefox (Android)</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Tap the menu (⋮) in the top right</li>
                  <li>Select "Install"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* APK Download */}
          <Card className="p-4 elevation-2 border-0 bg-accent/10">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                Native Android App (APK)
              </h3>
              <p className="text-xs text-muted-foreground">
                Download and install the native Android app directly on your device.
              </p>
              <a 
                href="https://github.com/Ahmadnedariya786/Noor-connect/releases/download/nightly/noor-connect-nightly.apk" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download APK
              </a>
            </div>
          </Card>

          <div className="pt-2 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Once installed, the app will work offline and load faster
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
