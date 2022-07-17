let cachedFibs = new Map<number, number>();
function fib(n: number): number {
  if (cachedFibs.get(n)) return Number(cachedFibs.get(n));
  if (n <= 1) return n;
  let result = fib(n - 1) + fib(n - 2);
  cachedFibs.set(n, result);
  return result;
}

for (let index = 0; index <= 300; index++) {
  console.log(`fibNumbers[${index}]=${BigInt(fib(index)).toString()};`);
}
