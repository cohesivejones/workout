import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('meals')
export class Meal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  calories: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  protein: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  carbs: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fat: number;
}
