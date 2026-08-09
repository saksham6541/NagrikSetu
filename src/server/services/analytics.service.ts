import { prisma } from "../../db";
import { IssueSeverity, IssueStatus } from "../../types";
import { getDistanceInMeters } from "../lib/utils";

export async function getAnalytics() {
  const issues = await prisma.issue.findMany({ include: { history: true } });
  const total = issues.length;
  const resolved = issues.filter((i) => i.status === IssueStatus.RESOLVED).length;
  const inProgress = issues.filter((i) => i.status === IssueStatus.IN_PROGRESS).length;
  const open = issues.filter(
    (i) => i.status === IssueStatus.OPEN || i.status === IssueStatus.VERIFYING
  ).length;

  const deptMap: Record<string, { total: number; resolved: number; timeSum: number }> = {};
  const catMap: Record<string, { totalHrs: number; count: number }> = {};

  for (const issue of issues) {
    const dept = issue.assignedDepartment || "Unassigned";
    if (!deptMap[dept]) deptMap[dept] = { total: 0, resolved: 0, timeSum: 0 };
    deptMap[dept].total += 1;
    if (issue.status === IssueStatus.RESOLVED) {
      deptMap[dept].resolved += 1;
      const created = new Date(issue.createdAt).getTime();
      const resolvedAt =
        issue.history
          ?.filter((h) => h.status === IssueStatus.RESOLVED)
          .map((h) => new Date(h.updatedAt).getTime())
          .sort()
          .pop() || Date.now();
      deptMap[dept].timeSum += (resolvedAt - created) / (1000 * 60 * 60);
    }

    if (!catMap[issue.category]) catMap[issue.category] = { totalHrs: 0, count: 0 };
    catMap[issue.category].count += 1;
    catMap[issue.category].totalHrs += 24;
  }

  const hotspots: {
    city: string;
    address: string;
    lat: number;
    lng: number;
    count: number;
    highSeverityCount: number;
    issues: string[];
  }[] = [];

  for (const issue of issues) {
    if (issue.status === IssueStatus.RESOLVED) continue;
    let found = false;
    for (const h of hotspots) {
      if (getDistanceInMeters(h.lat, h.lng, issue.lat, issue.lng) < 500) {
        h.count += 1;
        h.issues.push(issue.id);
        if (
          issue.severity === IssueSeverity.CRITICAL ||
          issue.severity === IssueSeverity.HIGH
        ) {
          h.highSeverityCount += 1;
        }
        found = true;
        break;
      }
    }
    if (!found) {
      hotspots.push({
        city: issue.city,
        address: issue.address,
        lat: issue.lat,
        lng: issue.lng,
        count: 1,
        highSeverityCount:
          issue.severity === IssueSeverity.CRITICAL || issue.severity === IssueSeverity.HIGH
            ? 1
            : 0,
        issues: [issue.id]
      });
    }
  }
  hotspots.sort((a, b) => b.count - a.count);

  return {
    metrics: {
      total,
      resolved,
      inProgress,
      open,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    },
    departmentPerformance: Object.entries(deptMap).map(([name, d]) => ({
      name,
      totalIssues: d.total,
      resolvedIssues: d.resolved,
      resolutionRate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0,
      avgResolutionTimeHrs: d.resolved > 0 ? Math.round(d.timeSum / d.resolved) : 24
    })),
    categoryResolutionTimes: Object.entries(catMap).map(([category, c]) => ({
      category,
      avgHrs: Math.round(c.totalHrs / c.count)
    })),
    hotspots: hotspots.slice(0, 5)
  };
}
