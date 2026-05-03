CREATE TABLE "prediction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_id" text NOT NULL,
	"station_id" text NOT NULL,
	"route_id" text NOT NULL,
	"direction" text NOT NULL,
	"destination_station_id" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"train_trip_id" text,
	"train_arrival_time" timestamp with time zone,
	"recommended_zone" text NOT NULL,
	"confidence" text NOT NULL,
	"scores" jsonb NOT NULL,
	"explanation" jsonb,
	CONSTRAINT "prediction_requests_recommended_zone_check" CHECK ("prediction_requests"."recommended_zone" in ('front', 'front-middle', 'middle', 'rear-middle', 'rear')),
	CONSTRAINT "prediction_requests_confidence_check" CHECK ("prediction_requests"."confidence" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "ride_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_request_id" uuid NOT NULL,
	"anonymous_id" text NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"boarded_zone" text NOT NULL,
	"crowding_rating" integer NOT NULL,
	"seat_available" boolean,
	"could_board" boolean DEFAULT true NOT NULL,
	"better_zone_observed" text,
	"notes" text,
	CONSTRAINT "ride_observations_boarded_zone_check" CHECK ("ride_observations"."boarded_zone" in ('front', 'front-middle', 'middle', 'rear-middle', 'rear')),
	CONSTRAINT "ride_observations_crowding_rating_check" CHECK ("ride_observations"."crowding_rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "station_zone_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" text NOT NULL,
	"route_id" text NOT NULL,
	"direction" text NOT NULL,
	"zone" text NOT NULL,
	"entrance_pressure" double precision NOT NULL,
	"transfer_pressure" double precision DEFAULT 0 NOT NULL,
	"exit_pressure" double precision DEFAULT 0 NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "station_zone_profiles_zone_check" CHECK ("station_zone_profiles"."zone" in ('front', 'front-middle', 'middle', 'rear-middle', 'rear'))
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"gtfs_stop_id" text,
	"complex_id" text,
	"lat" double precision,
	"lon" double precision,
	"routes" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_observations" ADD CONSTRAINT "ride_observations_prediction_request_id_prediction_requests_id_fk" FOREIGN KEY ("prediction_request_id") REFERENCES "public"."prediction_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_zone_profiles" ADD CONSTRAINT "station_zone_profiles_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prediction_requests_anonymous_id_idx" ON "prediction_requests" USING btree ("anonymous_id");--> statement-breakpoint
CREATE INDEX "prediction_requests_trip_lookup_idx" ON "prediction_requests" USING btree ("station_id","route_id","direction");--> statement-breakpoint
CREATE INDEX "ride_observations_prediction_request_id_idx" ON "ride_observations" USING btree ("prediction_request_id");--> statement-breakpoint
CREATE INDEX "ride_observations_anonymous_id_idx" ON "ride_observations" USING btree ("anonymous_id");--> statement-breakpoint
CREATE UNIQUE INDEX "station_zone_profiles_lookup_idx" ON "station_zone_profiles" USING btree ("station_id","route_id","direction","zone");--> statement-breakpoint
CREATE INDEX "stations_name_idx" ON "stations" USING btree ("name");