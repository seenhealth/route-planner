"use client";

import type { PassengerInfo, PassengerTripInfo } from "@/lib/passenger-index";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  Building2,
  Users,
} from "lucide-react";

interface PassengerDetailProps {
  passenger: PassengerInfo;
  onBack: () => void;
}

function TripSection({ info, label, address }: { info: PassengerTripInfo; label: string; address?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: info.color }}
        />
        <span className="text-xs font-medium">{label}</span>
        <Badge variant={info.type === "pickup" ? "default" : "secondary"} className="text-[10px] h-4">
          {info.type}
        </Badge>
      </div>
      <div className="ml-5 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span>{info.area}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span>Stop #{info.stopIndex + 1}</span>
        </div>
        {address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span className="break-words">{address}</span>
          </div>
        )}
        {info.coPassengers.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Users className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>
              Also in trip: {info.coPassengers.join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PassengerDetail({ passenger, onBack }: PassengerDetailProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm flex-1 truncate">
            {passenger.name}
          </span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Contact info */}
          <div className="space-y-1.5">
            {passenger.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{passenger.phone}</span>
              </div>
            )}
            {passenger.time && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{passenger.time}</span>
              </div>
            )}
            {passenger.purpose && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px] h-4">
                  {passenger.purpose}
                </Badge>
              </div>
            )}
            {passenger.assistiveDevice && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-muted-foreground/70">Device:</span>
                <span>{passenger.assistiveDevice}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {passenger.notes && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </p>
              <div className="text-xs bg-muted/50 rounded px-2 py-1.5 break-words">
                {passenger.notes}
              </div>
            </div>
          )}

          {/* Address */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Home Address
            </p>
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5 text-muted-foreground" />
              <span className="break-words">{passenger.address || "N/A"}</span>
            </div>
          </div>

          {passenger.destAddress && passenger.destAddress !== passenger.address && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Destination
              </p>
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5 text-muted-foreground" />
                <span className="break-words">{passenger.destAddress}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Trip assignments */}
          {passenger.pickupTrip && (
            <TripSection info={passenger.pickupTrip} label="Pickup Trip" address={passenger.address} />
          )}

          {passenger.pickupTrip && passenger.dropoffTrip && <Separator />}

          {passenger.dropoffTrip && (
            <TripSection info={passenger.dropoffTrip} label="Dropoff Trip" address={passenger.destAddress} />
          )}

          {!passenger.pickupTrip && !passenger.dropoffTrip && (
            <p className="text-xs text-muted-foreground">
              No trip assignments found.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
