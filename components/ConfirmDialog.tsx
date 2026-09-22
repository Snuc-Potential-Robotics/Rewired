"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered beside the title — say what kind of action this is at a glance. */
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive actions get the breach-red confirm button. */
  tone?: "default" | "destructive";
  /** Extra controls shown above the buttons, e.g. an opt-in toggle. */
  children?: React.ReactNode;
  onConfirm: () => void;
}

/**
 * Replaces `window.confirm` for the organiser controls.
 *
 * Beyond looking like the rest of the app, this fixes two things the native
 * dialog could not do: the confirm button states the actual action ("End the
 * CTF" rather than "OK"), and a dialog can carry its own controls, so an
 * option no longer has to be smuggled into the OK/Cancel choice.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  children,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2.5">
            {icon && (
              <span
                className={tone === "destructive" ? "text-breach" : "text-signal"}
              >
                {icon}
              </span>
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              tone === "destructive" && buttonVariants({ variant: "destructive" })
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
