import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

interface DashboardCriticalTicketsAlertProps {
  onViewTickets?: () => void;
}

export function DashboardCriticalTicketsAlert({ onViewTickets }: DashboardCriticalTicketsAlertProps = {}) {
  const { employees, ticketCategories, employeeTickets } =
    useTimeTracking();

  const today = new Date();

  // Get critical tickets (expired or expiring based on alert days setting)
  // Exclude optional tickets - only show mandatory and recommended
  const criticalTickets = useMemo(() => {
    return employeeTickets
      .map((ticket) => {
        const employee = employees.find((emp) => emp.id === ticket.employeeId);
        const category = ticketCategories.find(
          (cat) => cat.id === ticket.categoryId,
        );
        const expDate = new Date(ticket.expirationDate);
        const alertDays = category?.alertDaysBeforeExpiry || 30;
        const alertDate = new Date(expDate);
        alertDate.setDate(alertDate.getDate() - alertDays);

        let status = "valid";
        let daysLabel = "";

        if (expDate < today) {
          status = "expired";
          const daysExpired = Math.floor(
            (today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          daysLabel = `${daysExpired} day${daysExpired !== 1 ? "s" : ""} ago`;
        } else if (today >= alertDate) {
          status = "expiring-soon";
          const daysUntil = Math.floor(
            (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );
          daysLabel = `${daysUntil} day${daysUntil !== 1 ? "s" : ""} left`;
        }

        return {
          ...ticket,
          employeeName: employee?.name || "Unknown",
          categoryName: category?.name || "Unknown",
          requirementLevel: category?.requirementLevel || "optional",
          status,
          expirationDate: expDate,
          daysLabel,
        };
      })
      .filter((ticket) => ticket.status !== "valid" && ticket.requirementLevel !== "optional" && !ticket.excludeFromAlert)
      .sort((a, b) => {
        // Mandatory first, then recommended
        // Within each requirement level, expired first then expiring-soon
        const levelOrder: Record<string, number> = {
          mandatory: 0,
          recommended: 1,
        };
        const statusOrder: Record<string, number> = {
          expired: 0,
          "expiring-soon": 1,
        };

        const levelDiff = (levelOrder[a.requirementLevel] ?? 2) - (levelOrder[b.requirementLevel] ?? 2);
        if (levelDiff !== 0) return levelDiff;

        return (
          (statusOrder[a.status] ?? 2) -
          (statusOrder[b.status] ?? 2)
        );
      });
  }, [employeeTickets, employees, ticketCategories]);

  if (criticalTickets.length === 0) {
    return null;
  }

  const expiredCount = criticalTickets.filter(
    (t) => t.status === "expired",
  ).length;
  const expiringCount = criticalTickets.filter(
    (t) => t.status === "expiring-soon",
  ).length;

  return (
    <Card className="border-l-4 border-red-500 bg-red-50/50 mb-4">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-red-900">
                Expired/Expiring Tickets & Insurances
              </h3>
              <p className="text-xs text-red-700">
                {expiredCount > 0 && (
                  <>
                    <span className="font-semibold">{expiredCount} expired</span>
                    {expiringCount > 0 && " • "}
                  </>
                )}
                {expiringCount > 0 && (
                  <span className="font-semibold">
                    {expiringCount} expiring soon
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={onViewTickets}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
          >
            Review
          </Button>
        </div>

        {criticalTickets.length > 0 && (
          <div className="space-y-1 mt-3 text-xs">
            <style>{`
              @keyframes hellishFlash {
                0%, 100% { background-color: rgb(239, 68, 68); }
                50% { background-color: rgb(127, 29, 29); }
              }
              @keyframes hellishTextFlash {
                0%, 100% { color: rgb(255, 255, 255); }
                50% { color: rgb(255, 200, 124); }
              }
            `}</style>
            {criticalTickets.map((ticket, index) => {
              const isMandatory = ticket.requirementLevel === "mandatory";
              const isExpired = ticket.status === "expired";
              const nextTicket = criticalTickets[index + 1];
              const isLastMandatory =
                isMandatory && nextTicket?.requirementLevel !== "mandatory";

              return (
                <div key={ticket.id}>
                  <div
                    className={`flex items-center justify-between p-2 rounded border-l-3 text-xs gap-2 ${
                      isExpired && isMandatory
                        ? "border-red-700"
                        : isExpired && !isMandatory
                          ? "bg-orange-100 border-red-600"
                          : isMandatory
                            ? "bg-orange-100 border-orange-600"
                            : "bg-orange-50 border-orange-400"
                    }`}
                    style={isExpired && isMandatory ? {
                      animation: "hellishFlash 0.6s infinite",
                    } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className={`truncate block font-bold ${
                          isExpired && isMandatory
                            ? "text-white"
                            : isExpired
                              ? "text-red-900"
                              : isMandatory
                                ? "text-orange-900"
                                : "text-orange-800"
                        }`}
                        style={isExpired && isMandatory ? {
                          animation: "hellishTextFlash 0.6s infinite",
                        } : {}}
                      >
                        {ticket.employeeName}: {ticket.categoryName}
                      </span>
                      <span
                        className={`text-xs ${
                          isExpired && isMandatory
                            ? "text-yellow-100"
                            : isExpired
                              ? "text-red-700"
                              : "text-orange-700"
                        }`}
                      >
                        {isExpired
                          ? `Expired ${ticket.daysLabel || "ago"}`
                          : `Expires ${ticket.daysLabel || "soon"}`}
                      </span>
                    </div>
                    <Badge
                      className={`border-0 text-xs flex-shrink-0 font-bold ${
                        isExpired && isMandatory
                          ? "bg-red-900 text-yellow-100"
                          : isExpired && !isMandatory
                            ? "bg-red-600 text-white"
                            : isMandatory
                              ? "bg-orange-600 text-white"
                              : "bg-orange-500 text-white"
                      }`}
                      style={isExpired && isMandatory ? {
                        animation: "hellishFlash 0.6s infinite",
                      } : {}}
                    >
                      {isExpired ? "EXPIRED" : "SOON"}
                    </Badge>
                  </div>
                  {isLastMandatory && (
                    <div className="my-2 py-1 border-t-2 border-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
