from src.schemas.response.analytics import (
    AnalyticsOverviewResponse, MetricData, TimeSeriesPoint, RiskZoneData,
    TimelineEvent, AIRecommendation, AISummary, MapOverlays, DangerZone, RestrictedZone,
    MapWorker, MapPermit, MapCamera, MapGasSensor, FacilityZone, MapIncident
)

class AnalyticsService:
    @staticmethod
    async def get_overview() -> AnalyticsOverviewResponse:
        # Mock data for demonstration purposes, matching frontend expectations.
        # In a fully populated production DB, these would query risk repositories, alert rules, and graph schemas.
        overlays = MapOverlays(
            facility_zones=[
                FacilityZone(id="tank-farm", name="Tank Farm", x=50, y=50, width=350, height=250, color="var(--sf-surface-raised)"),
                FacilityZone(id="boiler", name="Boiler Unit", x=450, y=50, width=300, height=200, color="var(--sf-surface-raised)"),
                FacilityZone(id="cooling-tower", name="Cooling Tower", x=800, y=50, width=350, height=200, color="var(--sf-surface-raised)"),
                FacilityZone(id="pump-house", name="Pump House", x=450, y=300, width=250, height=180, color="var(--sf-surface-raised)"),
                FacilityZone(id="control-room", name="Control Room", x=750, y=300, width=400, height=250, color="var(--sf-surface-raised)"),
                FacilityZone(id="warehouse", name="Warehouse", x=50, y=350, width=350, height=400, color="var(--sf-surface-raised)"),
                FacilityZone(id="confined-space", name="Confined Space CS-07", x=450, y=530, width=250, height=220, color="var(--sf-surface-raised)"),
                FacilityZone(id="assembly", name="Emergency Assembly Point", x=750, y=600, width=400, height=150, color="var(--color-safe-500)", opacity=0.1),
            ],
            danger_zones=[
                DangerZone(id="dz1", center=[225, 175], radius=120, color="#ef4444", zone="Tank Farm A-12", incidentCount=6, highestRisk="Critical", confidence="94%")
            ],
            restricted_zones=[
                RestrictedZone(id="rz1", center=[600, 150], radius=150, color="#f59e0b", zone="Boiler Unit B-03", incidentCount=4, highestRisk="High", confidence="89%")
            ],
            evacuation_path=[
                [225, 175], [400, 175], [400, 600], [750, 675]
            ],
            workers=[
                MapWorker(id="w1", pos=[250, 150], name="Aarav Sharma"),
                MapWorker(id="w2", pos=[200, 200], name="Priya Patel"),
                MapWorker(id="w3", pos=[620, 160], name="Marcus Reyes"),
                MapWorker(id="w4", pos=[580, 140], name="David Chen")
            ],
            permits=[
                MapPermit(id="p1", pos=[280, 180], label="Hot Work PTW-2026-014"),
                MapPermit(id="p2", pos=[580, 640], label="Confined Space CS-09"),
                MapPermit(id="p3", pos=[620, 190], label="Electrical EL-02")
            ],
            cameras=[
                MapCamera(id="c1", pos=[50, 50], label="CCTV-07"),
                MapCamera(id="c2", pos=[450, 50], label="CCTV-12"),
                MapCamera(id="c3", pos=[800, 50], label="CCTV-03")
            ],
            gas_sensors=[
                MapGasSensor(id="gs1", pos=[225, 100], label="Gas Sensor G-14 (Elevated H2S)"),
                MapGasSensor(id="gs2", pos=[600, 100], label="Gas Sensor G-08 (Normal)")
            ],
            incidents=[
                MapIncident(id="inc1", x=230, y=180, severity="critical", zone="Tank Farm A-12", description="High gas concentration detected near tank T-02.", occurred_at="2026-07-21T10:15:00Z", incident_type="gas_leak"),
                MapIncident(id="inc2", x=610, y=140, severity="high", zone="Boiler Unit B-03", description="Unauthorized access detected in restricted area.", occurred_at="2026-07-21T09:45:00Z", incident_type="security_breach"),
                MapIncident(id="inc3", x=900, y=650, severity="low", zone="Assembly Point", description="Routine assembly drill completed.", occurred_at="2026-07-21T08:00:00Z", incident_type="drill")
            ]
        )

        # Generate Rule-based AI Summary
        zone_counts = {}
        for inc in overlays.incidents:
            zone_counts[inc.zone] = zone_counts.get(inc.zone, 0) + 1
            
        top_zone = "Unknown"
        if zone_counts:
            top_zone = max(zone_counts.items(), key=lambda x: x[1])[0]

        top_incidents = [i for i in overlays.incidents if i.zone == top_zone]
        incident_type = top_incidents[0].incident_type.replace('_', ' ') if top_incidents else "unknown issue"
        
        permit_issues = "repeated permit violations" if len(overlays.permits) > 2 else "no significant permit issues"
        sensor_status = "elevated gas concentration" if any("Elevated" in s.label for s in overlays.gas_sensors) else "normal sensor readings"
        worker_density = "high worker density" if len(overlays.workers) > 3 else "normal worker density"

        increase_percentage = len([i for i in overlays.incidents if i.severity == 'critical']) * 20 + 38
        
        predicted_impact = f"If unresolved, probability of escalation within four hours is estimated at 78%."
        
        primary_contributors = [
            f"AI has detected increasing compound risk around {top_zone} due to {sensor_status} and {permit_issues}."
        ]
        
        recommended_actions = [
            "Suspend hot work.",
            "Dispatch Safety Officer.",
            "Validate Gas Sensors."
        ]

        ai_summary = AISummary(
            increase_percentage=increase_percentage,
            primary_contributors=primary_contributors,
            predicted_impact=predicted_impact,
            recommended_actions=recommended_actions
        )

        ai_recommendations = []
        for inc in overlays.incidents:
            if inc.severity == 'critical':
                ai_recommendations.append(
                    AIRecommendation(
                        priority=1,
                        title=f"Evacuate {inc.zone}",
                        confidence="98%",
                        impact="High",
                        eta="< 5 mins",
                        status="Action Required"
                    )
                )
            elif inc.severity == 'high':
                ai_recommendations.append(
                    AIRecommendation(
                        priority=2,
                        title=f"Suspend Work in {inc.zone}",
                        confidence="92%",
                        impact="High",
                        eta="Immediate",
                        status="Action Required"
                    )
                )
        
        if len(overlays.workers) > 0:
             ai_recommendations.append(
                 AIRecommendation(
                     priority=3,
                     title="Dispatch Safety Officer",
                     confidence="88%",
                     impact="Medium",
                     eta="10 mins",
                     status="In Progress"
                 )
             )
             
        if any("Elevated" in s.label for s in overlays.gas_sensors):
             ai_recommendations.append(
                 AIRecommendation(
                     priority=4,
                     title="Validate Gas Sensors",
                     confidence="85%",
                     impact="Medium",
                     eta="15 mins",
                     status="Pending"
                 )
             )

        # Sort recommendations: priority ascending (1 is highest), then confidence
        ai_recommendations.sort(key=lambda r: r.priority)
        for i, rec in enumerate(ai_recommendations):
            rec.priority = i + 1

        predictive_timeline = []
        
        # Rule 1: Gas sensors
        if any("Elevated" in s.label for s in overlays.gas_sensors):
            predictive_timeline.append(
                TimelineEvent(
                    time="Next 1 hr", title="Gas accumulation risk", severity="Critical", confidence="88%",
                    reason="Elevated gas levels detected with ongoing nearby hot work permits.",
                    action="Activate auxiliary fans and evacuate immediate radius."
                )
            )

        # Rule 2: Permit conflicts & Incident counts
        if len(overlays.incidents) > 1 and len(overlays.permits) > 1:
            predictive_timeline.append(
                TimelineEvent(
                    time="Next 2 hrs", title="Incident Escalation", severity="High", confidence="85%",
                    reason=f"{len(overlays.incidents)} active incidents overlapping with {len(overlays.permits)} open permits.",
                    action="Halt non-essential permits in affected zones."
                )
            )
            
        # Rule 3: Worker density and Shift changes
        if len(overlays.workers) >= 4:
            predictive_timeline.append(
                TimelineEvent(
                    time="Next 4 hrs", title="Shift transition congestion", severity="Medium", confidence="92%",
                    reason="High worker density detected prior to shift change. Handover error rate may spike.",
                    action="Enforce strict face-to-face handover protocols."
                )
            )
            
        if not predictive_timeline:
            predictive_timeline.append(
                TimelineEvent(
                    time="Next 4 hrs", title="Stable Operations", severity="Low", confidence="95%",
                    reason="No significant risk multipliers detected in current telemetry.",
                    action="Maintain standard monitoring."
                )
            )

        return AnalyticsOverviewResponse(
            plant_status="Emergency",
            aiSummary=ai_summary,
            aiRecommendations=ai_recommendations[:5],
            predictiveTimeline=predictive_timeline,
            mapOverlays=overlays
        )
