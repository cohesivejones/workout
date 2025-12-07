import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('sleep_scores')
@Unique(['userId', 'date'])
export class SleepScore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer' })
  score: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
