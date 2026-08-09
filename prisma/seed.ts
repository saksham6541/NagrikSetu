import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export async function seedDatabase() {
  console.log("Seeding NagrikSetu database...");

  const passwordHash = await bcrypt.hash("changeme123", 10);

  const citizen = await prisma.user.upsert({
    where: { phone: "+919876543210" },
    update: {},
    create: {
      id: "user-citizen-demo",
      phone: "+919876543210",
      name: "Rajesh Sharma",
      role: "CITIZEN",
      city: "Bengaluru",
      ward: "Ward 45 - Koramangala",
      points: 180,
      trustScore: 72,
      badges: JSON.stringify(["🎖️ New Citizen", "📍 First Report", "✅ Verified Reporter"])
    }
  });

  const officer = await prisma.user.upsert({
    where: { email: "vignesh.officer@bbmp.gov.in" },
    update: {},
    create: {
      id: "user-officer-demo",
      phone: "+919900112233",
      name: "Vignesh Kumar",
      email: "vignesh.officer@bbmp.gov.in",
      passwordHash,
      role: "OFFICER",
      city: "Bengaluru",
      ward: "Zone East",
      department: "Municipal Road Works Division (BBMP/PWD)",
      points: 0,
      trustScore: 100,
      badges: JSON.stringify(["🏛️ BBMP Officer"])
    }
  });

  const worker = await prisma.user.upsert({
    where: { email: "ramesh.worker@bbmp.gov.in" },
    update: {},
    create: {
      id: "user-worker-demo",
      phone: "+919988776655",
      name: "Ramesh Field",
      email: "ramesh.worker@bbmp.gov.in",
      passwordHash,
      role: "WORKER",
      city: "Bengaluru",
      ward: "Ward 45 - Koramangala",
      department: "Municipal Road Works Division (BBMP/PWD)",
      skill: "Road Repair Technician",
      rating: 4.7,
      completedTasks: 42,
      availabilityStatus: "AVAILABLE",
      points: 0,
      trustScore: 95,
      badges: JSON.stringify(["🔧 Field Worker"])
    }
  });

  const issue1Id = "issue-demo-pothole-1";
  const existing = await prisma.issue.findUnique({ where: { id: issue1Id } });
  if (!existing) {
    await prisma.issue.create({
      data: {
        id: issue1Id,
        title: "Large pothole near Koramangala 5th Block",
        description: "Deep pothole on the main road causing traffic and risk to two-wheelers. Worsened after recent rains.",
        category: "POTHOLE",
        severity: "HIGH",
        status: "OPEN",
        lat: 12.9352,
        lng: 77.6245,
        address: "80 Feet Road, Koramangala 5th Block",
        city: "Bengaluru",
        ward: "Ward 45 - Koramangala",
        reporterName: citizen.name,
        reporterPhone: citizen.phone,
        reporterId: citizen.id,
        upvotes: 12,
        assignedDepartment: "Municipal Road Works Division (BBMP/PWD)",
        verificationRate: 80,
        slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        history: {
          create: {
            status: "OPEN",
            note: "Issue reported by citizen.",
            updatedBy: citizen.name
          }
        },
        aiAnalysis: {
          create: {
            detectedCategory: "POTHOLE",
            detectedSeverity: "HIGH",
            confidenceScore: 0.91,
            duplicateFound: false,
            priorityScore: 78,
            departmentRouting: "Municipal Road Works Division (BBMP/PWD)",
            summaryDraftEn: "AI detected high-severity pothole. Routed to Municipal Road Works.",
            summaryDraftHi: "एआई द्वारा गंभीर गड्ढा पहचाना गया। सड़क विभाग को भेजा गया।"
          }
        },
        votes: {
          create: [
            { voterIdentifier: citizen.phone, userId: citizen.id },
            { voterIdentifier: "+919811122233" },
            { voterIdentifier: "+919822233344" }
          ]
        }
      }
    });
  }

  const issue2Id = "issue-demo-streetlight-1";
  const existing2 = await prisma.issue.findUnique({ where: { id: issue2Id } });
  if (!existing2) {
    await prisma.issue.create({
      data: {
        id: issue2Id,
        title: "Streetlight not working near Indiranagar metro",
        description: "Multiple poles dark for over a week. Unsafe for pedestrians at night.",
        category: "STREETLIGHT",
        severity: "MEDIUM",
        status: "ASSIGNED",
        lat: 12.9784,
        lng: 77.6408,
        address: "100 Feet Road, Indiranagar",
        city: "Bengaluru",
        ward: "Ward 88 - Indiranagar",
        reporterName: "Priya Nair",
        reporterPhone: "+919700001111",
        upvotes: 5,
        assignedDepartment: "Electrical and Street Lighting Authority",
        assignedWorkerId: worker.id,
        assignedWorkerName: worker.name,
        verificationRate: 60,
        slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        history: {
          create: [
            { status: "OPEN", note: "Reported by citizen.", updatedBy: "Priya Nair" },
            { status: "ASSIGNED", note: `Assigned to field worker ${worker.name}.`, updatedBy: officer.name }
          ]
        },
        aiAnalysis: {
          create: {
            detectedCategory: "STREETLIGHT",
            detectedSeverity: "MEDIUM",
            confidenceScore: 0.88,
            duplicateFound: false,
            priorityScore: 55,
            departmentRouting: "Electrical and Street Lighting Authority",
            summaryDraftEn: "Street lighting outage detected. Medium priority.",
            summaryDraftHi: "स्ट्रीटलाइट खराब। मध्यम प्राथमिकता।"
          }
        },
        assignments: {
          create: {
            id: generateId("assign"),
            workerId: worker.id,
            workerName: worker.name,
            assignedBy: officer.id,
            assignedByName: officer.name,
            status: "PENDING",
            notes: "Please inspect and replace bulbs if needed."
          }
        }
      }
    });
  }

  console.log("Seed complete.");
  console.log("  Citizen OTP login: +91 98765 43210 (OTP: 123456)");
  console.log("  Officer: vignesh.officer@bbmp.gov.in / changeme123");
  console.log("  Worker:  ramesh.worker@bbmp.gov.in / changeme123");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
