<template>
  <div>
    <h2>Add New Clinic</h2>
    <form @submit.prevent="addClinic">
      <div>
        <label for="name">Clinic Name:</label>
        <input type="text" v-model="name" id="name" required />
      </div>
      <div>
        <label for="address">Address:</label>
        <input type="text" v-model="address" id="address" required />
      </div>
      <div>
        <label for="province">Province:</label>
        <input type="text" v-model="province" id="province" required />
      </div>
      <div>
        <label for="latitude">Latitude:</label>
        <input type="number" step="any" v-model="latitude" id="latitude" required />
      </div>
      <div>
        <label for="longitude">Longitude:</label>
        <input type="number" step="any" v-model="longitude" id="longitude" required />
      </div>
      <button type="submit">Add Clinic</button>
    </form>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'AddClinicForm',
  data() {
    return {
      name: '',
      address: '',
      province: '',
      latitude: '',
      longitude: ''
    };
  },
  methods: {
    ...mapActions(['addClinic']),
    addClinic() {
      const clinic = {
        name: this.name,
        address: this.address,
        province: this.province,
        location: [parseFloat(this.latitude), parseFloat(this.longitude)]
      };
      this.addClinic(clinic);
      // Clear form fields
      this.name = '';
      this.address = '';
      this.province = '';
      this.latitude = '';
      this.longitude = '';
    }
  }
};
</script>

<style scoped>
/* Add any necessary styles here */
form {
  display: flex;
  flex-direction: column;
  max-width: 300px;
}
div {
  margin-bottom: 10px;
}
label {
  margin-right: 10px;
}
</style>
