import { redirect } from "next/navigation";

export default function CoachRedirect() {
  redirect("/general?vue=coach");
}
