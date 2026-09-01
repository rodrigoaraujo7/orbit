export type Contact = {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
}

// ponytail: local mock, same convention as data/projects.ts — swap for a
// fetch once the API exists.
export const contacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'Marcelo Tavares',
    email: 'marcelo@portaldocorretor.com.br',
    phone: '(11) 98765-4321',
  },
  { id: 'contact-2', name: 'Camila Bastos' },
  { id: 'contact-3', name: 'Studio Belle' },
  { id: 'contact-4', name: 'TransRápido' },
  { id: 'contact-5', name: 'Advocacia Prado' },
  { id: 'contact-6', name: 'Distribuidora Norte' },
  { id: 'contact-7', name: 'Clínica Vitalis' },
  { id: 'contact-8', name: 'Pessoal' },
  {
    id: 'contact-9',
    name: 'Northwind Labs',
    email: 'ops@northwindlabs.io',
    company: 'Northwind Labs',
  },
]
