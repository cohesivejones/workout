import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";

@Entity("users")
@Unique(["email"])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  password: string;
}
