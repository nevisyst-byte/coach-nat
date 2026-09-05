import { redirect } from "next/navigation";

export default function MonPlanningRedirect() {
  redirect("/planning?vue=moi");
}
