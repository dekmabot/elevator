export default

{
    elevators: [],
    elevatorsIdle: [],

    floors: [],
    floorsQueueUp: [],
    floorsQueueDown: [],
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
            obj.userCallFloor(index, floorNum);
        });
        elevator.on("passing_floor", function (floorNum, direction) {
            obj.elevatorPassingFloor(index, floorNum, direction);
        });
        elevator.on("stopped_at_floor", function (floorNum) {
            obj.elevatorStoppedOnFloor(index, floorNum);
        });
        this.elevators[index] = elevator;

        this.elevatorGoToDefaultFloor(index);
    },
    initFloor: function (floor, index) {
        let obj = this;

        floor.on("up_button_pressed", function () {
            obj.userCallElevator(index, 'up');
        });
        floor.on("down_button_pressed", function () {
            obj.userCallElevator(index, 'down');
        });
        this.floors[index] = floor;
        this.floorsQueueUp[index] = false;
        this.floorsQueueDown[index] = false;
    },
    userCallElevator: function (floorNum, direction) {
        console.log('User called an elevator to ' + ('up' === direction ? 'upstairs' : 'downstairs') + ' on floor ' + floorNum);
        if (this.checkIfElevatorIsGoingHere(floorNum)) {
            console.log('... but elevator is going there');
            return;
        }

        if ('up' === direction) {
            this.floorsQueueUp[floorNum] = true;
        } else {
            this.floorsQueueDown[floorNum] = true;
        }

        let elevatorIdleIndex = this.getElevatorIdle();
        if (null !== elevatorIdleIndex) {
            let elevator = this.elevators[elevatorIdleIndex];
            console.log('... and idle elevator ' + elevatorIdleIndex + '[' + elevator.currentFloor() + '] => going to floor ' + floorNum);
            this.userCallFloor(elevatorIdleIndex, floorNum);
        }
    },
    userCallFloor: function (elevatorIndex, floorNum) {
        let elevator = this.elevators[elevatorIndex];
        console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => user pressed floor ' + floorNum);

        if (null === this.searchFloorInElevatorDestinationQueue(elevatorIndex, floorNum)) {
            this.elevatorAddFloorToDestinationQueue(elevatorIndex, [floorNum]);
        }
//        elevator.goToFloor(floorNum);
        /* TODO: переделать на последовательное формиование очереди этажей */

        this.setElevatorNotIdle(elevatorIndex);
    },
    setElevatorIdle: function (elevatorIndex) {
        let elevator = this.elevators[elevatorIndex];

        console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => going to be Idle');

        let newFloors = this.getClosestFloorsQueued(elevator.currentFloor());
        if (null !== newFloors) {
            this.elevatorAddFloorToDestinationQueue(elevatorIndex, newFloors);
            return;
        }

        this.elevatorGoToDefaultFloor(elevatorIndex);
        /* TODO: глючит */
    },
    setElevatorNotIdle: function (elevatorIndex) {
        let elevator = this.elevators[elevatorIndex];
        console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => starts moving');
        this.elevatorsIdle[elevatorIndex] = false;
    },
    getElevatorIdle: function () {
        for (let i = 0; i < this.elevatorsIdle.length; i++) {
            if (this.elevatorsIdle[i] === true) {
                return i;
            }
        }
        return null;
    },
    getElevatorDefaultFloor: function (elevatorIndex) {
        let countFloors = this.floors.length;
        let countElevators = this.elevators.length;

        return Math.floor(countFloors / countElevators * elevatorIndex)
    },
    getClosestFloorsQueued: function (floorNum) { /* TODO: сейчас забирает все этажи */
        let floors = [];
        for (let i = 0; i < this.floors.length; i++) {
            if (i === floorNum) {
                continue;
            }
            if (true === this.floorsQueueDown[i] || true === this.floorsQueueUp[i]) { /* TODO: Сейчас направление не учитывается */
                floors.push(i);
            }
        }

        if (floors.length > 0) {
            console.log('... found queued floors ' + floors.join());
            return floors;
        }
        else {
            console.log('... found no queued floors');
            return null;
        }
    },
    elevatorGoToDefaultFloor: function (elevatorIndex) {
        let defaultFloor = this.getElevatorDefaultFloor(elevatorIndex);
        let elevator = this.elevators[defaultFloor];
        if (typeof elevator === 'undefined') {
            this.elevatorsIdle[elevatorIndex] = true;
            return;
        }

        if (defaultFloor !== elevator.currentFloor()) {
            console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => going to default floor: ' + defaultFloor);
            elevator.goToFloor(defaultFloor);
        } else {
            console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => is on default floor: ' + defaultFloor);
            this.elevatorsIdle[elevatorIndex] = true;
        }
    },
    elevatorPassingFloor: function (elevatorIndex, floorNum, direction) {
        let elevator = this.elevators[elevatorIndex];
        console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => gonna pass ' + ('up' === direction ? 'upstairs' : 'downstairs') + ' near floor: ' + floorNum);

        let queueUp = [];
        let queueDown = [];
        for (let i = 0; i < this.floors.length; i++) {
            if (true === this.floorsQueueUp[i]) {
                queueUp.push(i);
            }
            if (true === this.floorsQueueDown[i]) {
                queueDown.push(i);
            }
        }
        console.log('... queueUp: ' + queueUp.join());
        console.log('... queueDown: ' + queueDown.join());

        if (elevator.loadFactor() > 0.9) {
            console.log('... but is full[' + elevator.loadFactor() + '] to pick up users');
            return;
        }

        if ('up' === direction && true === this.floorsQueueUp[floorNum] && !this.checkIfElevatorIsGoingHere(floorNum)) {
            console.log('... and gonna stop and pick up users going upstairs');
            this.elevatorAddFloorToDestinationQueue(elevatorIndex, [floorNum]);
        } else if ('down' === direction && true === this.floorsQueueDown[floorNum] && !this.checkIfElevatorIsGoingHere(floorNum)) {
            console.log('... and gonna stop and pick up users going downstairs');
            this.elevatorAddFloorToDestinationQueue(elevatorIndex, [floorNum]);
        }
    },
    elevatorStoppedOnFloor: function (elevatorIndex, floorNum) {
        let elevator = this.elevators[elevatorIndex];
        console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => stopped on floor: ' + floorNum);
        console.log('... with having queue ' + elevator.destinationQueue.join());

        this.removeFloorFromEmptyElevatorsQueue(floorNum);
        /* TODO: redirect moving here empty elevator */

        /*
        if ('up' === direction && true === this.floorsQueueUp[floorNum]) {
            this.removeFloorFromEmptyElevatorsQueue(floorNum);
        }else if('down' === direction && true === this.floorsQueueDown[floorNum]) {
            this.removeFloorFromEmptyElevatorsQueue(floorNum);
        }
        */

        this.floorsQueueUp[floorNum] = false;
        this.floorsQueueDown[floorNum] = false;
    },
    elevatorAddFloorToDestinationQueue: function (elevatorIndex, newFloors) {
        let elevator = this.elevators[elevatorIndex];

        let queue = elevator.destinationQueue;
        for (let i = 0; i < newFloors.length; i++) {
            queue.push(newFloors[i]);
        }

        let direction = this.checkNewDirection(elevatorIndex, queue);
        if ('up' === direction) {
            console.log('... queue sort up before ' + queue.join());
            queue.sort();
            console.log('... queue sort up after ' + queue.join());
        } else {
            console.log('... queue sort down before ' + queue.join());
            queue.sort();
            queue.reverse();
            console.log('... queue sort down after ' + queue.join());
        }

        let filteredQueue = [];
        for (let i = 0; i < queue.length; i++) {
            if (('up' === direction && queue[i] >= elevator.currentFloor()) || ('down' === direction && queue[i] <= elevator.currentFloor())) {
                filteredQueue.push(queue[i]);
            }
        }
        queue = filteredQueue;

        // If I`m empty, going to farest floor in busyest direction
        if (elevator.loadFactor() === 0) {
            queue.sort();
            queue.reverse();
            console.log('... elevator is empty, so go to the higher floor:' + queue.join());
        }

        console.log('... set queue to: ' + queue.join());
        elevator.destinationQueue = queue;
        elevator.checkDestinationQueue();
    },
    removeFloorFromEmptyElevatorsQueue: function (floorNum) {
        for (let i = 0; i < this.elevators.length; i++) {
            let elevator = this.elevators[i];
            if (elevator.loadFactor() > 0) {
                continue;
            }

            let destinationIndex = this.searchFloorInElevatorDestinationQueue(i, floorNum);
            if (null !== destinationIndex) {
                elevator.destinationQueue.splice(destinationIndex, 1);
                elevator.checkDestinationQueue();
            }
        }
    },
    checkIfElevatorIsGoingHere: function (floorNum) {
        for (let i = 0; i < this.elevators.length; i++) {
            let destinationIndex = this.searchFloorInElevatorDestinationQueue(i, floorNum);
            if (null !== destinationIndex) {
                return true;
            }
        }

        return false;
    },
    checkNewDirection: function (elevatorIndex, newFloors) {
        let elevator = this.elevators[elevatorIndex];
        let direction = 0;
        for (let i = 0; i < newFloors.length; i++) {
            if (newFloors[i] > elevator.currentFloor()) {
                direction++;
            } else if (newFloors[i] < elevator.currentFloor()) {
                direction--;
            }
        }

        console.log('Elevator ' + elevatorIndex + '[' + elevator.currentFloor() + '] => going ' + (direction > 0 ? 'upstairs' : 'downstairs') + '(sum=' + direction + ') to floors ' + newFloors.join());

        if (direction >= 0) {
            return 'up';
        } else {
            return 'down';
        }
    },
    searchFloorInElevatorDestinationQueue: function (elevatorIndex, floorNum) {
        let elevator = this.elevators[elevatorIndex];
        for (let i = 0; i < elevator.destinationQueue.length; i++) {
            if (elevator.destinationQueue[i] === floorNum) {
                return i;
            }
        }

        return null;
    },
    update: function (dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}

