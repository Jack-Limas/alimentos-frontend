/** Paginated list body from the contract: `{ data, meta: { page, pageSize, total } }`. */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

/** Single resource body: `{ data }`. */
export interface DataResponse<T> {
  data: T;
}
