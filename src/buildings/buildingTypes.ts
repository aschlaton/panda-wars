import { Building } from './Building';

export class Capital extends Building {
  constructor(ownerId: number) {
    super('capital', ownerId, 0.7); // 30% damage reduction
  }
}

export class Settlement extends Building {
  constructor(ownerId: number) {
    super('settlement', ownerId, 0.85); // 15% damage reduction
  }
}
