import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageCircle, Hash, CreditCard } from "lucide-react";

interface DiscordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'plan' | 'service';
  planName?: string;
  serviceName?: string;
  price?: string;
}

export default function DiscordModal({ 
  open, 
  onOpenChange, 
  type, 
  planName, 
  serviceName, 
  price 
}: DiscordModalProps) {
  const isService = type === 'service';
  const title = isService ? serviceName : `${planName} Plan`;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2 sm:gap-3">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Join Our Discord
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 p-1 sm:p-2">
          {/* Service/Plan Info */}
          <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            {price && (
              <Badge className="bg-blue-600 text-white text-sm">
                <CreditCard className="h-3 w-3 mr-1" />
                {price}
              </Badge>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                1
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Join TechSus Discord Server</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Click the Discord button below to join our community server where all purchases are processed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                2
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Navigate to Purchase Channels</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {isService 
                    ? "Go to the #plans-and-perks channel to purchase this service."
                    : "Go to the #plans-and-perks channel to purchase this monthly plan."
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                3
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Submit a Ticket</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Submit a Ticket in #support-ticket and follow the support members instructions. They will need 3 things, your username, one of your service passwords, and your [Put payment proof stuff here, wont be here until the payment system is set up after public testing]. NEVER SHARE YOUR SERVICE PASSWORDS WITH ANYONE. All that is required to confirm you own the account in a ticket is your username and any of your service passwords. We also strongly reccomend you save all of the service names and their passwords and keep them up to date in case you need to recover your account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                4
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Access Your Services</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Once payment is confirmed, you'll receive a password for this service on your TechSus dashboard and access to this service in Proxy Playground.
                </p>
              </div>
            </div>
          </div>

          {/* Channel References */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
              Relevant Channels
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              {isService ? (
                <>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></span>
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs">#plans-and-perks</code>
                    <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">- Purchase plans and services</span>
                  </div>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></span>
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs">#support-ticket</code>
                    <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">- Get help linking this purchase to your TechSus Account</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></span>
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs">#plans-and-perks</code>
                    <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">- Purchase plans and services</span>
                  </div>
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></span>
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs">#support-ticket</code>
                    <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">- Get help linking this purchase to your TechSus Account</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Discord Button */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <Button 
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-2.5 sm:py-3 text-sm sm:text-base"
              onClick={() => window.open('https://discord.gg/sH5eJr8Gup', '_blank')}
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Join TechSus Discord Server
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full py-2 sm:py-2.5 text-sm sm:text-base"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>

          {/* Note */}
          <div className="text-center px-2">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              All purchases must be completed through our Discord server for security and verification purposes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
