import { redirect } from "next/navigation";
import { getCity } from "@/lib/cities";

export default function LegacyCityGenrePage({ params }: { params: { city: string; genre: string } }) {
  const city = getCity(params.city);
  if (city) redirect(`/${city.prefectureKey}/${city.key}/${params.genre}`);
  redirect("/");
}
