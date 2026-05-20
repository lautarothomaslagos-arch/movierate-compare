import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Re-export de Link, useRouter, redirect, etc. que automáticamente
// preservan el locale activo en navegación.
// Importar desde acá en todos los componentes, NO desde next/link directo.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
