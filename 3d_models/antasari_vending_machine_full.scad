// =============================================================================
// ANTASARI MART - SMART VENDING MACHINE 3D ENCLOSURE
// Parametric Modular CAD Model for 3D Printing
// Fully Compatible with OpenSCAD, Bambu Studio, Cura, PrusaSlicer
// =============================================================================

$fn = 40; // Resolution

// VIEW MODE:
// 0 = Full Assembled Machine
// 1 = Exploded 3D View
// 2 = Part 1: Main Chassis Body
// 3 = Part 2: Front Bezel & TFT Door
// 4 = Part 3: 4x Stepper Motor Shelf Tray
// 5 = Part 4: Vending Dispenser Spiral Coil (Auger)
// 6 = Part 5: Top Lid & Kawaii Roof
view_mode = 0; // [0:Assembled, 1:Exploded, 2:Chassis, 3:Front Bezel, 4:Motor Shelf, 5:Spiral Coil, 6:Top Lid]

// GLOBAL PARAMETERS (mm)
chassis_w = 170.0;
chassis_d = 150.0;
chassis_h = 210.0;
wall_t    = 3.0;

// MOTOR 28BYJ-48 SPECS
motor_pitch = 35.0;
motor_dia   = 28.5;

// TFT DISPLAY SPECS (ILI9341 2.8" / 2.4")
tft_w = 72.0;
tft_h = 50.0;
tft_hole_pitch_x = 80.0;
tft_hole_pitch_y = 45.0;

// -----------------------------------------------------------------------------
// MODULE: PART 1 - MAIN CHASSIS BODY
// -----------------------------------------------------------------------------
module part1_main_chassis() {
    difference() {
        // Outer cabinet
        cube([chassis_w, chassis_d, chassis_h]);
        
        // Internal hollow cavity
        translate([wall_t, -1, wall_t])
            cube([chassis_w - 2*wall_t, chassis_d - wall_t + 1, chassis_h - wall_t + 1]);
        
        // USB-C Power Port Cutout on Left Wall (Aligned with ESP32-S3)
        translate([-1, 35.0, 16.0])
            cube([wall_t + 2, 14.0, 8.0]);
            
        // Rear Wall Ventilation Louvers
        for(i = [0:4]) {
            translate([30 + i*24, chassis_d - wall_t - 1, 170])
                cube([16, wall_t + 2, 4]);
        }
    }
    
    // Slanted Product Drop Chute Ramp
    translate([wall_t, 12.0, 8.0])
        rotate([28, 0, 0])
            cube([chassis_w - 2*wall_t, 125.0, 3.0]);
            
    // ESP32-S3 Snap-in / Screw Cradle (Floor)
    translate([12.0, 25.0, wall_t]) {
        // Standoffs
        for(ox = [0, 52]) {
            for(oy = [0, 24]) {
                translate([ox + 3, oy + 3, 0])
                    difference() {
                        cylinder(r=3.5, h=6.0);
                        cylinder(r=1.5, h=7.0);
                    }
            }
        }
    }
    
    // Mini Breadboard (SYB-170) Base Retainer Guides
    translate([85.0, 25.0, wall_t]) {
        translate([-2, -2, 0]) cube([52, 2.5, 5]);
        translate([-2, 38, 0]) cube([52, 2.5, 5]);
        translate([-2, 0, 0])  cube([2.5, 38, 5]);
        translate([47, 0, 0])  cube([2.5, 38, 5]);
    }
    
    // 4x ULN2003 Driver Board Vertical Retaining Slots (Rear Wall)
    for(i = [0:3]) {
        translate([15.0 + i*36.0, chassis_d - wall_t - 16.0, 75.0]) {
            cube([3.0, 16.0, 35.0]); // Left rail
            translate([32.0, 0, 0]) cube([3.0, 16.0, 35.0]); // Right rail
            translate([0, 13.0, 0]) cube([35.0, 3.0, 3.0]);  // Base lip
        }
    }
    
    // Internal Shelf Support Rails
    translate([wall_t, 25.0, 115.0]) cube([5.0, 100.0, 6.0]);
    translate([chassis_w - wall_t - 5.0, 25.0, 115.0]) cube([5.0, 100.0, 6.0]);
    
    // Front Corner Screw Mounting Bosses (4x M3)
    translate([wall_t, 0, wall_t]) corner_boss();
    translate([chassis_w - wall_t - 10, 0, wall_t]) corner_boss();
    translate([wall_t, 0, chassis_h - wall_t - 12]) corner_boss();
    translate([chassis_w - wall_t - 10, 0, chassis_h - wall_t - 12]) corner_boss();
}

module corner_boss() {
    difference() {
        cube([10, 12, 12]);
        translate([5, 6, -1]) cylinder(r=1.5, h=14);
    }
}

// -----------------------------------------------------------------------------
// MODULE: PART 2 - FRONT BEZEL & TFT DOOR
// -----------------------------------------------------------------------------
module part2_front_bezel() {
    difference() {
        union() {
            // Main Plate
            cube([chassis_w, 4.0, chassis_h]);
            // Decorative Header Banner
            translate([15, 4.0, 186]) cube([chassis_w - 30, 2.0, 20]);
            // Kawaii Roof Ears
            translate([25, 0, chassis_h]) cube([22, 4.0, 10]);
            translate([chassis_w - 47, 0, chassis_h]) cube([22, 4.0, 10]);
        }
        
        // 1. TFT 2.8"/2.4" Screen Viewing Window
        translate([(chassis_w - tft_w)/2, -1, 135.0])
            cube([tft_w, 6.0, tft_h]);
            
        // 2. Product Drop / Collection Exit Window
        translate([25.0, -1, 15.0])
            cube([120.0, 6.0, 48.0]);
            
        // 4 Corner Screw Holes
        for(cx = [6, chassis_w - 6]) {
            for(cz = [6, chassis_h - 6]) {
                translate([cx, -1, cz]) rotate([-90, 0, 0]) cylinder(r=1.6, h=6.0);
            }
        }
    }
    
    // TFT Rear Standoff Studs (4x M3 at 80x45mm pitch)
    translate([chassis_w/2, 0, 160.0]) {
        for(sx = [-tft_hole_pitch_x/2, tft_hole_pitch_x/2]) {
            for(sz = [-tft_hole_pitch_y/2, tft_hole_pitch_y/2]) {
                translate([sx, -5.0, sz])
                    rotate([90, 0, 0])
                        difference() {
                            cylinder(r=3.8, h=5.0);
                            cylinder(r=1.4, h=6.0);
                        }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// MODULE: PART 3 - 4X STEPPER MOTOR SHELF TRAY
// -----------------------------------------------------------------------------
module part3_motor_shelf() {
    shelf_w = 162.0;
    shelf_d = 105.0;
    
    difference() {
        union() {
            cube([shelf_w, shelf_d, 4.0]);
            // Side rail guides
            cube([5.0, shelf_d, 8.0]);
            translate([shelf_w - 5.0, 0, 0]) cube([5.0, shelf_d, 8.0]);
            // Slot dividers
            translate([shelf_w/2 - 1.5, 0, 0]) cube([3.0, shelf_d, 12.0]);
            translate([0, shelf_d/2 - 1.5, 0]) cube([shelf_w, 3.0, 12.0]);
        }
        
        // 4 Motor Cutouts (2x2 Grid)
        for(mx = [40.0, 122.0]) {
            for(my = [28.0, 78.0]) {
                // Center shaft hole
                translate([mx, my, -1]) cylinder(r=5.0, h=6.0);
                // 2x 28BYJ-48 M3 screw ear holes (35mm pitch)
                translate([mx - 17.5, my, -1]) cylinder(r=1.7, h=6.0);
                translate([mx + 17.5, my, -1]) cylinder(r=1.7, h=6.0);
                // Motor wire pass-through slot
                translate([mx - 8.0, my + 10.0, -1]) cube([16.0, 6.0, 6.0]);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// MODULE: PART 4 - VENDING DISPENSER SPIRAL COIL (AUGER)
// -----------------------------------------------------------------------------
module part4_spiral_coil() {
    r_hub = 7.0;
    r_out = 19.0;
    spiral_len = 75.0;
    pitch = 18.0;
    turns = 4;
    
    // Motor D-shaft coupler hub
    difference() {
        cylinder(r=r_hub, h=16.0);
        // 5mm D-Shaft profile
        intersection() {
            cylinder(r=2.6, h=18.0);
            translate([-3, -3, -1]) cube([6, 4.5, 20]);
        }
    }
    
    // Dispenser Spiral Auger
    for(i = [0:turns*30]) {
        rotate([0, 0, i * 12])
            translate([0, 0, 12 + i * (spiral_len / (turns * 30))])
                rotate([25, 0, 0])
                    cube([r_out - r_hub + 2, 3.2, 3.0]);
    }
    
    // Product ejection push tab at front
    translate([r_out - 6, 0, spiral_len + 12])
        cube([6, 3.2, 4.0]);
}

// -----------------------------------------------------------------------------
// MODULE: PART 5 - TOP LID & KAWAII ROOF
// -----------------------------------------------------------------------------
module part5_top_lid() {
    lid_w = 172.0;
    lid_d = 152.0;
    
    union() {
        // Top Roof Plate
        cube([lid_w, lid_d, 3.5]);
        // Overhang Lip
        difference() {
            cube([lid_w, lid_d, 8.0]);
            translate([3.0, 3.0, -1]) cube([lid_w - 6.0, lid_d - 6.0, 10.0]);
        }
        // Inner Alignment Insert (Snaps into chassis)
        translate([5.0, 5.0, -8.0])
            difference() {
                cube([162.0, 142.0, 8.0]);
                translate([3.0, 3.0, -1]) cube([156.0, 136.0, 10.0]);
            }
        // Kawaii Grip Handle / Roof Peak
        translate([lid_w/2 - 25, lid_d/2 - 12, 3.5])
            cube([50, 24, 10]);
    }
}

// -----------------------------------------------------------------------------
// RENDER CONTROLLER
// -----------------------------------------------------------------------------
if (view_mode == 0) {
    // Fully Assembled
    color("LightPink") part1_main_chassis();
    color("HotPink") translate([0, -4.0, 0]) part2_front_bezel();
    color("Lavender") translate([4.0, 25.0, 120.0]) part3_motor_shelf();
    // 4 Spirals
    color("Gold") translate([44.0, 53.0, 120.0]) rotate([90, 0, 0]) part4_spiral_coil();
    color("Gold") translate([126.0, 53.0, 120.0]) rotate([90, 0, 0]) part4_spiral_coil();
    color("Gold") translate([44.0, 103.0, 120.0]) rotate([90, 0, 0]) part4_spiral_coil();
    color("Gold") translate([126.0, 103.0, 120.0]) rotate([90, 0, 0]) part4_spiral_coil();
    color("DeepSkyBlue") translate([-1.0, -1.0, chassis_h]) part5_top_lid();
} else if (view_mode == 1) {
    // Exploded View
    part1_main_chassis();
    translate([0, -60.0, 0]) part2_front_bezel();
    translate([4.0, 25.0, 170.0]) part3_motor_shelf();
    translate([44.0, 0.0, 170.0]) rotate([90, 0, 0]) part4_spiral_coil();
    translate([126.0, 0.0, 170.0]) rotate([90, 0, 0]) part4_spiral_coil();
    translate([-1.0, -1.0, chassis_h + 50]) part5_top_lid();
} else if (view_mode == 2) {
    part1_main_chassis();
} else if (view_mode == 3) {
    part2_front_bezel();
} else if (view_mode == 4) {
    part3_motor_shelf();
} else if (view_mode == 5) {
    part4_spiral_coil();
} else if (view_mode == 6) {
    part5_top_lid();
}
