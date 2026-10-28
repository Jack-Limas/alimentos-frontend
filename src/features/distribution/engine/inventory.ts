// The inventory helpers the engine uses, gathered like the backend's inventory/domain index.
export { addDays, daysBetween, type CalendarDate } from './calendar';
export { allocateFefo, compareFefo, isExpired, type FefoLot } from './fefo';
export { fromMilli, toMilli } from './quantity';
