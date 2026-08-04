import { sendEmail } from "../../src/services/mailer";
import {
  notifyTicketAssigned,
  notifyNoteAdded,
  notifyTicketStatusUpdated,
} from "../../src/services/notification.service";

jest.mock("../../src/services/mailer");

const mockSendEmail = sendEmail as jest.Mock;

describe("Notification Service Unit Tests", () => {
  beforeEach(() => {
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("should send an assignment email to the assignee", async () => {
    const ticket = { title: "Fix Sink", property: "Lagos", unit: "2", assigned_to: "worker@example.com", due_date: null };

    await notifyTicketAssigned("worker@example.com", ticket, "Admin");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = mockSendEmail.mock.calls[0];
    expect(to).toBe("worker@example.com");
    expect(subject).toContain("Fix Sink");
    expect(subject).toContain("assigned");
  });

  it("should send a status-update email with old and new stage", async () => {
    const ticket = { title: "Repaint Hall", property: "Abuja", unit: "", assigned_to: "painter@example.com" };

    await notifyTicketStatusUpdated("painter@example.com", ticket, "Completed", "In Progress", "Admin");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = mockSendEmail.mock.calls[0];
    expect(to).toBe("painter@example.com");
    expect(subject).toContain("Repaint Hall");
    expect(body).toContain("In Progress");
    expect(body).toContain("Completed");
  });

  it("should send a note-added email including the note text", async () => {
    const ticket = { title: "Check Meter", property: "Port Harcourt", unit: "5", assigned_to: "mech@example.com" };

    await notifyNoteAdded("mech@example.com", ticket, "Leak found under the sink.", "Colleague");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = mockSendEmail.mock.calls[0];
    expect(to).toBe("mech@example.com");
    expect(subject).toContain("Check Meter");
    expect(body).toContain("Leak found under the sink.");
  });

  it("should HTML-escape user-controlled fields", async () => {
    const ticket = { title: "<script>alert('x')</script>", property: "A&B", unit: "", assigned_to: "a@b.com" };

    await notifyTicketAssigned("a@b.com", ticket, "Admin");

    const body = mockSendEmail.mock.calls[0][2] as string;
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });
});