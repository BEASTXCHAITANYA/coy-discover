import { redirect } from "next/navigation";

// Open straight onto Discover, the tab this assignment is about.
export default function Index() {
  redirect("/discover");
}
