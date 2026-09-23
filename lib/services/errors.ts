export class InsufficientStockError extends Error {
  constructor(ingredientName: string, available: string, requested: string) {
    super(`Not enough ${ingredientName} in stock: have ${available}, need ${requested}`);
    this.name = "InsufficientStockError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}
