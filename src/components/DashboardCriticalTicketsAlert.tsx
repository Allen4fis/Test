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
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  // Get critical tickets (expired or expiring within 1 month)
  const criticalTickets = useMemo(() => {
    return employeeTickets
      .map((ticket) => {
        const employee = employees.find((emp) => emp.id === ticket.employeeId);
        const category = ticketCategories.find(
          (cat) => cat.id === ticket.categoryId,
        );
        const expDate = new Date(ticket.expirationDate);

        let status = "valid";
        if (expDate < today) {
          status = "expired";
        } else if (expDate <= oneMonthFromNow) {
          status = "expiring-soon";
        }

        return {
          ...ticket,
          employeeName: employee?.name || "Unknown",
          categoryName: category?.name || "Unknown",
          status,
          expirationDate: expDate,
        };
      })
      .filter((ticket) => ticket.status !== "valid");
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
    <Card className="border-red-500 bg-gradient-to-r from-red-50 to-orange-50 mb-6">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">
                  ⚠️ CRITICAL ALERT: Expired/Expiring Tickets & Insurances
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {expiredCount > 0 && (
                    <>
                      <span className="font-semibold">{expiredCount} EXPIRED</span>
                      {expiringCount > 0 && " • "}
                    </>
                  )}
                  {expiringCount > 0 && (
                    <span className="font-semibold">
                      {expiringCount} expiring within 1 month
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {criticalTickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between bg-white/70 p-3 rounded-lg border-l-4 border-red-500"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {ticket.employeeName} - {ticket.categoryName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {ticket.status === "expired"
                        ? `Expired: ${ticket.expirationDate.toLocaleDateString()}`
                        : `Expires: ${ticket.expirationDate.toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge
                    className={
                      ticket.status === "expired"
                        ? "bg-red-600 text-white border-0"
                        : "bg-yellow-600 text-white border-0"
                    }
                  >
                    {ticket.status === "expired" ? "EXPIRED" : "EXPIRING SOON"}
                  </Badge>
                </div>
              ))}
              {criticalTickets.length > 5 && (
                <p className="text-sm text-red-700 font-semibold px-3">
                  ... and {criticalTickets.length - 5} more
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-red-200">
          <Button
            onClick={() => setSelectedView("tickets")}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 flex-1"
          >
            Review All Tickets
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
