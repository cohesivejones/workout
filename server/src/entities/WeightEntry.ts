import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('weight_entries')
@Unique(['userId', 'date'])
export class WeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  weight: number;
}
