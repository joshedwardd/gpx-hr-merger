export const gpxWithHr = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
 <trk><name>run</name><trkseg>
  <trkpt lat="52.5200" lon="13.4050"><ele>34.5</ele><time>2026-07-01T08:00:00Z</time>
   <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>120</gpxtpx:hr><gpxtpx:cad>80</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>
  </trkpt>
  <trkpt lat="52.5201" lon="13.4052"><ele>35.0</ele><time>2026-07-01T08:00:10Z</time>
   <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>124</gpxtpx:hr><gpxtpx:cad>82</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>
  </trkpt>
 </trkseg></trk>
</gpx>`;

export const gpxWeirdPrefix = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
 <trk><trkseg>
  <trkpt lat="52.5200" lon="13.4050"><time>2026-07-01T08:00:00Z</time>
   <extensions><ns3:TrackPointExtension><ns3:hr>131</ns3:hr></ns3:TrackPointExtension></extensions>
  </trkpt>
 </trkseg></trk>
</gpx>`;

export const gpxNoHr = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
 <trk><trkseg>
  <trkpt lat="52.5202" lon="13.4054"><time>2026-07-01T08:00:20Z</time></trkpt>
  <trkpt lat="52.5200" lon="13.4050"><ele>34.5</ele><time>2026-07-01T08:00:00Z</time></trkpt>
  <trkpt lat="52.5203" lon="13.4056"></trkpt>
 </trkseg></trk>
</gpx>`;

export const tcxWithHr = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
 <Activities><Activity Sport="Running">
  <Lap StartTime="2026-07-01T08:00:00Z"><Track>
   <Trackpoint>
    <Time>2026-07-01T08:00:00Z</Time>
    <Position><LatitudeDegrees>52.5200</LatitudeDegrees><LongitudeDegrees>13.4050</LongitudeDegrees></Position>
    <AltitudeMeters>34.5</AltitudeMeters>
    <HeartRateBpm><Value>118</Value></HeartRateBpm>
    <Cadence>78</Cadence>
   </Trackpoint>
   <Trackpoint>
    <Time>2026-07-01T08:00:05Z</Time>
    <HeartRateBpm><Value>121</Value></HeartRateBpm>
   </Trackpoint>
  </Track></Lap>
 </Activity></Activities>
</TrainingCenterDatabase>`;

export const tcxRunCadence = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
 <Activities><Activity Sport="Running"><Lap StartTime="2026-07-01T08:00:00Z"><Track>
  <Trackpoint>
   <Time>2026-07-01T08:00:00Z</Time>
   <HeartRateBpm><Value>140</Value></HeartRateBpm>
   <Extensions><ns3:TPX><ns3:RunCadence>88</ns3:RunCadence></ns3:TPX></Extensions>
  </Trackpoint>
 </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`;

// paused activity: two trksegs. legs within each segment are ~111 m; the pause
// gap between segments spans ~667 m that must NOT count as distance.
export const gpxPaused = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
 <trkpt lat="52.5200" lon="13.4050"><time>2026-07-01T08:00:00Z</time></trkpt>
 <trkpt lat="52.5210" lon="13.4050"><time>2026-07-01T08:01:00Z</time></trkpt>
</trkseg><trkseg>
 <trkpt lat="52.5260" lon="13.4050"><time>2026-07-01T08:11:00Z</time></trkpt>
 <trkpt lat="52.5270" lon="13.4050"><time>2026-07-01T08:12:00Z</time></trkpt>
</trkseg></trk></gpx>`;

// TCX with two Laps, each its own Track: an auto-pause across the lap boundary.
export const tcxTwoLaps = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
 <Activities><Activity Sport="Running">
  <Lap StartTime="2026-07-01T08:00:00Z"><Track>
   <Trackpoint><Time>2026-07-01T08:00:00Z</Time><HeartRateBpm><Value>120</Value></HeartRateBpm></Trackpoint>
  </Track></Lap>
  <Lap StartTime="2026-07-01T08:10:00Z"><Track>
   <Trackpoint><Time>2026-07-01T08:10:00Z</Time><HeartRateBpm><Value>140</Value></HeartRateBpm></Trackpoint>
  </Track></Lap>
 </Activity></Activities>
</TrainingCenterDatabase>`;

export const malformedXml = `<gpx><trk><trkseg><trkpt lat="1"`;

export const notTrackXml = `<?xml version="1.0"?><root><thing>hello</thing></root>`;
