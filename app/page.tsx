import WeddingInvitation from "./wedding-invitation";

type HomeProps = {
  searchParams: Promise<{
    to?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const guest = Array.isArray(params.to) ? params.to[0] : params.to;

  return <WeddingInvitation guestName={guest || "Bapak/Ibu/Saudara/i"} />;
}
