export default

{
    elevators: [],
    elevators_idle: [],

    floors: [],
    floors_queue_up: [],
    floors_queue_down: [],
    init: function (elevators, floors) {
        for (let i = 0; i < floors.length; i++) {
            this.initFloor(floors[i], i);
        }
        for (let i = 0; i < elevators.length; i++) {
            this.initElevator(elevators[i], i);
        }
    },
    initElevator: function (elevator, index) {
        let obj = this;

        elevator.on("idle", function () {
            obj.setElevatorIdle(index);
        });
        elevator.on("floor_button_pressed", function (floorNum) {
            obj.callFloor(index, floorNum);
        });
        this.elevators[index] = elevator;
        this.elevators_idle[index] = true;
    },
    initFloor: function (floor, index) {
        let obj = this;

        floor.on("up_button_pressed", function () {
            obj.callElevator(index, 'up');
        });
        floor.on("down_button_pressed", function () {
            obj.callElevator(index, 'down');
        });
        this.floors[index] = floor;
        this.floors_queue_up[index] = 0;
        this.floors_queue_down[index] = 0;
    },
    callElevator: function (floorNum, direction) {
        let freeElevatorIndex = this.getElevatorIdle();
        if (null !== freeElevatorIndex) {
            this.callFloor(freeElevatorIndex, floorNum);
        } else if ('up' === direction) {
            obj.floors_queue_up[floorNum]++;
        } else if ('down' === direction) {
            obj.floors_queue_down[floorNum]++;
        }
    },
    callFloor: function (elevator_index, floorNum) {
        this.elevators[elevator_index].goToFloor(floorNum);
        this.setElevatorNotIdle(elevator_index);
    },
    getFloorMaxQueue: function () {
        let max = 0;
        let max_index = 0;
        for (let i = 0; i < this.floors_queue_up; i++) {
            if (this.floors_queue_up[i] > max) {
                max = this.floors_queue_up[i];
                max_index = i;
            }
        }
        for (let i = 0; i < this.floors_queue_down; i++) {
            if (this.floors_queue_down[i] > max) {
                max = this.floors_queue_down[i];
                max_index = i;
            }
        }

        return max_index;
    },
    setElevatorIdle: function (elevator_index) {
        this.elevators_idle[elevator_index] = true;
    },
    setElevatorNotIdle: function (elevator_index) {
        this.elevators_idle[elevator_index] = false;
    },
    getElevatorIdle: function () {
        for (let i = 0; i < this.elevators_idle.length; i++) {
            if (this.elevators_idle[i] === true ) {
                return i;
            }
        }
        return null;
    },
    update: function (dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}

