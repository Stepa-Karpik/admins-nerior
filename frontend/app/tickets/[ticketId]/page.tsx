import { AdminWorkspace } from "@/components/admin-workspace"
export default function Page({ params }: { params: { ticketId: string } }) { return <AdminWorkspace section="ticket" ticketId={params.ticketId} /> }
