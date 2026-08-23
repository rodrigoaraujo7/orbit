export function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

export function optionalEnv(name: string) {
  return process.env[name]
}
