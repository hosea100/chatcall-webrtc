"use client";

import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
  onOpenChange: (open: boolean) => void;
}

export function IncomingCallDialog({
  open,
  callerName,
  onAccept,
  onReject,
  onOpenChange,
}: IncomingCallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Incoming Call</DialogTitle>
          <DialogDescription>{callerName} is calling you</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={onReject}>
            <PhoneOff className="h-4 w-4 mr-2" />
            Decline
          </Button>
          <Button onClick={onAccept}>
            <Phone className="h-4 w-4 mr-2" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
