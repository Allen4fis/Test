import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function DashboardCriticalTicketsAlert() {
  const { employees, ticketCategories, employeeTickets, setSelectedView } =
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
      .filter((ticket) => ticket.status !== "valid" && ticket.requirementLevel !== "optional")
      .sort((a, b) => {
        // Mandatory first, then recommended
        const priorityOrder: Record<string, number> = {
          mandatory: 0,
          recommended: 1,
        };
        return (
          (priorityOrder[a.requirementLevel] ?? 2) -
          (priorityOrder[b.requirementLevel] ?? 2)
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
            onClick={() => setSelectedView("tickets")}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
          >
            Review
          </Button>
        </div>

        {criticalTickets.length > 0 && (
          <div className="space-y-1 mt-3 text-xs">
            {criticalTickets.slice(0, 3).map((ticket, index) => {
              const isMandatory = ticket.requirementLevel === "mandatory";
              const nextTicket = criticalTickets[index + 1];
              const isLastMandatory =
                isMandatory && nextTicket?.requirementLevel !== "mandatory";

              return (
                <div key={ticket.id}>
                  <div
                    className={`flex items-center justify-between p-2 rounded border-l-2 ${
                      isMandatory
                        ? "bg-white/80 border-red-500"
                        : "bg-white/50 border-orange-400"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className={`truncate block ${
                          isMandatory
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        }`}
                      >
                        {ticket.employeeName}: {ticket.categoryName}
                      </span>
                      <span
                        className={`text-xs ${
                          isMandatory ? "text-gray-700" : "text-gray-500"
                        }`}
                      >
                        {ticket.daysLabel}
                      </span>
                    </div>
                    <Badge
                      className={`border-0 text-xs ml-2 flex-shrink-0 ${
                        ticket.status === "expired"
                          ? isMandatory
                            ? "bg-red-600 text-white"
                            : "bg-red-500 text-white"
                          : isMandatory
                            ? "bg-yellow-600 text-white"
                            : "bg-yellow-500 text-white"
                      }`}
                    >
                      {ticket.status === "expired" ? "Expired" : "Soon"}
                    </Badge>
                  </div>
                  {isLastMandatory && (
                    <div className="my-1 border-t border-gray-300" />
                  )}
                </div>
              );
            })}
            {criticalTickets.length > 3 && (
              <p className="text-xs text-red-600 font-semibold px-2">
                +{criticalTickets.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
