export abstract class Building {
  public type: string;
  public ownerId: number;
  public defenseMultiplier: number;

  constructor(type: string, ownerId: number, defenseMultiplier: number) {
    this.type = type;
    this.ownerId = ownerId;
    this.defenseMultiplier = defenseMultiplier;
  }
}
