// Componente server que inyecta un script <script type="application/ld+json">
// en el head/body. Crawlers de Google lo leen para rich snippets.

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
