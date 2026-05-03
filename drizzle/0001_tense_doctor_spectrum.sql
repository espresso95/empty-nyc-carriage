CREATE TABLE "entrances_exits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" text NOT NULL,
	"stop_name" text NOT NULL,
	"complex_id" text,
	"gtfs_stop_id" text,
	"daytime_routes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"entrance_type" text,
	"entry_allowed" boolean DEFAULT false NOT NULL,
	"exit_allowed" boolean DEFAULT false NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gtfs_routes" (
	"route_id" text PRIMARY KEY NOT NULL,
	"route_short_name" text NOT NULL,
	"route_long_name" text,
	"route_color" text,
	"route_text_color" text
);
--> statement-breakpoint
CREATE TABLE "gtfs_stops" (
	"stop_id" text PRIMARY KEY NOT NULL,
	"stop_name" text NOT NULL,
	"stop_lat" double precision,
	"stop_lon" double precision,
	"location_type" integer DEFAULT 0 NOT NULL,
	"parent_station" text
);
--> statement-breakpoint
CREATE INDEX "entrances_exits_station_id_idx" ON "entrances_exits" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "entrances_exits_gtfs_stop_id_idx" ON "entrances_exits" USING btree ("gtfs_stop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entrances_exits_unique_location_idx" ON "entrances_exits" USING btree ("station_id","lat","lon","entrance_type");--> statement-breakpoint
CREATE INDEX "gtfs_stops_parent_station_idx" ON "gtfs_stops" USING btree ("parent_station");--> statement-breakpoint
CREATE INDEX "gtfs_stops_name_idx" ON "gtfs_stops" USING btree ("stop_name");